import { json, requireDb } from '../_shared/http.js';
export async function onRequestGet({ env }) {
  try {
    const db=requireDb(env);
    const {results=[]}=await db.prepare("SELECT id,name,slug,category,short_description,description,image_url,badge,price_label,price_egp,status,featured,quantity_available,sort_order FROM products WHERE status IN ('published','out_of_stock') ORDER BY featured DESC,sort_order ASC,created_at DESC").all();
    return json({products:results});
  } catch(e) { console.error('products GET:',e.message); return json({message:'تعذر تحميل المنتجات الآن.'},503); }
}
