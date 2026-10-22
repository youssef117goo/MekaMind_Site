import { json, requireDb } from '../_shared/http.js';
export async function onRequestGet({ env }) {
  try {
    const db=requireDb(env);
    const {results=[]}=await db.prepare("SELECT id,name,slug,short_description,description,status,sort_order FROM services WHERE status='published' ORDER BY sort_order ASC,created_at DESC").all();
    return json({services:results});
  } catch(e) { console.error('services GET:',e.message); return json({message:'تعذر تحميل الخدمات الآن.'},503); }
}
