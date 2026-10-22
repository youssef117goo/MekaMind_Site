export async function notifyWhatsApp(order, env) {
  const required=['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_NOTIFY_TO','WHATSAPP_TEMPLATE_NAME','WHATSAPP_TEMPLATE_LANGUAGE','WHATSAPP_SENDER_PHONE_DIGITS'];
  if (required.some(k=>!env[k])) return { status:'not_configured', error:'' };
  const receiver=String(env.WHATSAPP_NOTIFY_TO).replace(/\D/g,'');
  const sender=String(env.WHATSAPP_SENDER_PHONE_DIGITS||'').replace(/\D/g,'');
  if (!/^\d{8,15}$/.test(receiver) || receiver===sender) return { status:'failed', error:'Invalid or identical WhatsApp sender/receiver number.' };
  const type={product:'طلب منتج',service:'طلب خدمة هندسية',consultation:'مناقشة فكرة'}[order.order_type]||order.order_type;
  const params=[order.order_number,order.name,order.phone,type,order.item_name||'لم يحدد',String(order.quantity||1),`الموعد: ${order.timeline||'غير محدد'} | التفاصيل: ${order.details||'لا توجد'}`.slice(0,900)];
  const version=env.META_GRAPH_API_VERSION||'v26.0';
  try {
    const r=await fetch(`https://graph.facebook.com/${version}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{
      method:'POST',headers:{Authorization:`Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},
      body:JSON.stringify({messaging_product:'whatsapp',to:receiver,type:'template',template:{name:env.WHATSAPP_TEMPLATE_NAME,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE},components:[{type:'body',parameters:params.map(text=>({type:'text',text}))}]}})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data.error||!data.messages?.[0]?.id) return {status:'failed',error:String(data?.error?.message||`WhatsApp API status ${r.status}`).slice(0,300)};
    return {status:'sent',error:''};
  } catch(e) { return {status:'failed',error:String(e?.message||'Request failed').slice(0,300)}; }
}
