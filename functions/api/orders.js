import { clean, json, requireDb } from '../_shared/http.js';
import { notifyWhatsApp } from '../_shared/notify.js';
import { hashText } from '../_shared/auth.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body=await request.json(); } catch { return json({message:'بيانات الطلب غير صالحة.'},400); }
  const name=clean(body.name,100), phone=clean(body.phone,40), type=clean(body.type,20), item=clean(body.item,160), details=clean(body.details,1500), timeline=clean(body.timeline,100)||'غير محدد';
  const quantity=Number(body.quantity||1);
  if (body.company_website) return json({message:'تعذر التحقق من الطلب.'},400);
  if (body.consent!==true) return json({message:'لازم توافق على استخدام بيانات التواصل للرد على طلبك.'},400);
  if(name.length<2 || !/^[+\d\s()\-]{7,40}$/.test(phone) || !['product','service','consultation'].includes(type) || !Number.isInteger(quantity)||quantity<1||quantity>1000) return json({message:'راجع الاسم ورقم التواصل ونوع الطلب والكمية.'},400);
  let db;
  try { db=requireDb(env); }
  catch { return json({message:'استقبال الطلبات لم يتم تفعيله بعد. تواصل معنا عبر واتساب مؤقتًا.'},503); }
  try {
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    const ipHash=await hashText(ip+String(env.ADMIN_SESSION_SECRET||'mekamind-public-order-salt'));
    const attempts=await db.prepare("SELECT COUNT(*) AS total FROM order_rate_limits WHERE ip_hash=? AND created_at>=datetime('now','-15 minutes')").bind(ipHash).first();
    if(Number(attempts?.total||0)>=10) return json({message:'تم إرسال طلبات كثيرة من هذا الاتصال. انتظر قليلًا ثم جرّب مرة أخرى.'},429);
    await db.prepare('INSERT INTO order_rate_limits (ip_hash) VALUES (?)').bind(ipHash).run();
    await db.prepare("DELETE FROM order_rate_limits WHERE created_at<datetime('now','-24 hours')").run();
  } catch(e) { console.error('order rate limit:',e.message); }
  const orderNumber=`MM-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const id=crypto.randomUUID();
  const now=new Date().toISOString();
  const order={id,order_number:orderNumber,name,phone,order_type:type,item_name:item,quantity,timeline,details,consent:1,status:'new',admin_notes:'',created_at:now,updated_at:now};
  try {
    await db.prepare(`INSERT INTO orders (id,order_number,name,phone,order_type,item_name,quantity,timeline,details,consent,status,notification_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`)
      .bind(id,orderNumber,name,phone,type,item,quantity,timeline,details,1,'new',now,now).run();
  } catch(e) {
    console.error('order save failed:',e.message);
    return json({message:'لم نتمكن من تسجيل الطلب. لم يتم تأكيد استلامه؛ جرّب مرة أخرى أو تواصل معنا مباشرة.'},500);
  }
  // Notification is a separate best-effort step: a WhatsApp outage must not turn a saved order into a false failure.
  const notification=await notifyWhatsApp(order,env);
  try {
    await db.prepare('UPDATE orders SET notification_status=?, notification_error=?, updated_at=? WHERE id=?').bind(notification.status,notification.error||'',new Date().toISOString(),id).run();
  } catch(e) { console.error('order notification status update failed:',e.message); }
  return json({ok:true,orderNumber,notification:notification.status});
}
