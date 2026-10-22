import { clean, json, requireDb, validOrigin } from '../../_shared/http.js';
import { constantTimeEqual, hashText, issueSession, readSession, sessionCookie } from '../../_shared/auth.js';

export async function onRequestGet(context) {
  const session=await readSession(context.request,context.env);
  return json({authenticated:!!session,username:session?.username||null});
}
export async function onRequestPost(context) {
  const {request,env}=context;
  if(!validOrigin(request)) return json({message:'طلب غير مسموح.'},403);
  if(!env.ADMIN_USERNAME||!env.ADMIN_PASSWORD||!env.ADMIN_SESSION_SECRET) return json({message:'إعداد دخول لوحة الإدارة لم يكتمل على الاستضافة.'},503);
  let b; try{b=await request.json();}catch{return json({message:'بيانات الدخول غير صالحة.'},400);}
  const username=clean(b.username,100), password=String(b.password||'');
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const ipHash=await hashText(ip+String(env.ADMIN_SESSION_SECRET));
  let db; try{db=requireDb(env);}catch{return json({message:'قاعدة البيانات غير مهيأة.'},503);}
  const attemptRow=await db.prepare("SELECT COUNT(*) AS total FROM login_attempts WHERE ip_hash=? AND success=0 AND created_at>=datetime('now','-15 minutes')").bind(ipHash).first();
  if(Number(attemptRow?.total||0)>=8) return json({message:'محاولات دخول كثيرة. انتظر 15 دقيقة ثم جرّب مرة أخرى.'},429);
  const ok=constantTimeEqual(username,env.ADMIN_USERNAME)&&constantTimeEqual(password,env.ADMIN_PASSWORD);
  await db.prepare('INSERT INTO login_attempts (ip_hash,success) VALUES (?,?)').bind(ipHash,ok?1:0).run();
  if(!ok) return json({message:'اسم المستخدم أو كلمة المرور غير صحيحة.'},401);
  await db.prepare('DELETE FROM login_attempts WHERE ip_hash=? AND success=0').bind(ipHash).run();
  const token=await issueSession(username,env);
  return json({ok:true,username},200,{'set-cookie':sessionCookie(request,token)});
}
export async function onRequestDelete(context) {
  if(!validOrigin(context.request)) return json({message:'طلب غير مسموح.'},403);
  return json({ok:true},200,{'set-cookie':sessionCookie(context.request,'',true)});
}
