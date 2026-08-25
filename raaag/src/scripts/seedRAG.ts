import { EmbeddingModel } from '../services/rag/infrastructure/EmbeddingModel';
import { VectorStoreRepository } from '../services/rag/infrastructure/VectorStoreRepository';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';

const documents = [
  "Upon receiving a damaged shipment report, the customer service agent must log the incident with severity HIGH. Immediately contact the driver to verify the damage, request photographic evidence, and notify the claims department. The customer must be informed within 30 minutes. If the damage exceeds $500, escalate to the regional manager for approval.",
  "في حالة فقدان الشحنة، يجب على وكيل خدمة العملاء بدء تحقيق داخلي خلال ساعة واحدة. يجب مراجعة آخر موقع معروف للشحنة في نظام التتبع والتواصل مع السائق والمستودع. إذا لم يتم العثور على الشحنة خلال 24 ساعة، يتم تصنيفها كمفقودة نهائياً ويتم تعويض العميل وفقاً للسياسة.",
  "If a delivery vehicle breaks down, the driver must immediately park safely, turn on hazard lights, and contact the dispatch center. Dispatch will arrange a replacement vehicle or tow truck. The driver must stay with the vehicle and ensure the cargo is secure. Estimated resolution time: 2-4 hours.",
  "في حالة وقوع حادث مروري، يجب على السائق أولاً التأكد من سلامته وسلامة الآخرين. يجب الاتصال بالشرطة والإسعاف إذا لزم الأمر. بعد ذلك، يجب إبلاغ مركز التحكم وتقديم تقرير أولي بالموقع والأضرار. لا يجوز للسائق مغادرة موقع الحادث حتى وصول السلطات.",
  "When a customer disputes a delivery (e.g., non-receipt), the agent should verify the delivery signature/photo proof. If proof is missing or unclear, initiate a trace with the driver. If the customer is not satisfied, offer a partial refund or re-delivery. All disputes must be resolved within 48 hours.",
  "سياسة استرداد الأموال: يحق للعميل طلب استرداد كامل في حالة عدم استلام الشحنة خلال 5 أيام عمل من الموعد المحدد. في حالة تلف الشحنة، يتم استرداد المبلغ بعد تقديم صور توضح الضرر. يتم معالجة طلبات الاسترداد خلال 3 أيام عمل.",
  "Fragile items must be stored in designated areas with clear \"FRAGILE\" labels. They should be placed on top of other packages and not stacked. Use bubble wrap and sturdy boxes. During picking, handlers must use two hands and avoid dropping. Any damage to fragile items should be reported immediately.",
  "يجب تخزين الطرود عالية القيمة في منطقة آمنة مقفلة. فقط الموظفون المصرح لهم يمكنهم الوصول إليها. يجب تسجيل كل حركة للطرود عالية القيمة في سجل خاص. في حالة فقدان أي طرد عالي القيمة، يتم إخطار مدير الأمن فوراً.",
  "Incidents are classified as LOW, MEDIUM, HIGH, or CRITICAL. LOW: minor delays (<2 hours) – resolved by agent. MEDIUM: delivery failure or minor damage – escalated to team lead. HIGH: lost shipment or significant damage – escalated to department manager. CRITICAL: accident with injuries or major fraud – escalated to executive team and legal.",
  "جهات الاتصال الطارئة: مدير العمليات: 0501234567، مدير الأسطول: 0509876543، فريق الدعم الفني: 0505555555. في حالات الطوارئ الحرجة، يجب الاتصال بمدير العمليات أولاً ثم إعلام الفريق التنفيذي.",
  "For shipments delayed beyond the estimated delivery time, the system automatically sends an SMS and email to the customer every 2 hours until delivery. The customer service team must proactively call the customer if the delay exceeds 4 hours. Offer a discount voucher for the next shipment as compensation.",
  "في حالة نفاد الوقود أثناء التسليم، يجب على السائق الاتصال بقسم الأسطول لتزويده بالوقود. يجب إيقاف المركبة في مكان آمن وتشغيل الأضواء التحذيرية. لا يجوز للسائق محاولة الحصول على وقود من مصادر غير معتمدة.",
  "Customer complaints are logged and assigned a priority. Low-priority complaints (e.g., minor service issues) are resolved within 24 hours. High-priority complaints (e.g., lost shipment) are escalated and resolved within 4 hours. All complaints are tracked in the CRM system and reviewed weekly.",
  "عند استلام البضائع في المستودع، يجب فحص العبوات للتأكد من عدم وجود تلف ظاهر. يجب مقارنة الكميات مع قائمة الشحن. في حالة وجود اختلافات، يجب تسجيلها وإبلاغ المشتريات خلال ساعة. يتم تحديث نظام المخزون فور الانتهاء من الفحص.",
  "Returned items are inspected for quality and restocked if in sellable condition. Items with defects are sent to the claims department. The customer is refunded within 3 business days. All returns must be logged with reason codes (e.g., damaged, wrong item, customer changed mind).",
  "إذا لم يكن العميل متاحاً لتسليم الشحنة، يجب على السائق محاولة الاتصال به مرتين خلال 15 دقيقة. إذا لم يرد، يتم إعادة الجدولة وإبلاغ العميل برسالة نصية. بعد محاولتين فاشلتين، يتم إرجاع الشحنة إلى المستودع وتسجيلها كـ \"محاولة تسليم فاشلة\".",
  "When an incident is escalated to the Owner (Super Admin), the Customer Service Manager must prepare a one-page briefing summarizing the issue, actions taken, financial impact, and recommended resolution. The owner will review and approve or reject the proposal within 2 hours during business hours.",
  "يجب تخزين البضائع الحساسة للحرارة في مناطق مكيفة بدرجة حرارة تتراوح بين 15-25 درجة مئوية. يتم مراقبة درجة الحرارة بشكل مستمر باستخدام أجهزة استشعار. في حالة ارتفاع درجة الحرارة، يتم إطلاق إنذار ويجب نقل البضائع إلى منطقة احتياطية فوراً.",
  "At the end of each day, drivers must reconcile their cash collections with the system records. Any discrepancies must be explained and approved by the finance team. Unresolved discrepancies are escalated to the operations manager. The reconciliation report is saved in the system for audit.",
  "تعتبر منصة LogiCore نظاماً متكاملاً لإدارة العمليات اللوجستية، وتشمل إدارة الشحنات، تتبع السائقين، التواصل مع العملاء، وإدارة الحسابات المالية. توفر المنصة رؤية فورية لجميع العمليات وتدعم اتخاذ القرارات بناءً على البيانات."
];

function chunkDocument(text: string, maxLength: number = 1000): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLength) {
      current += sentence + ' ';
    } else {
      if (current) chunks.push(current.trim());
      current = sentence + ' ';
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function seedRAG() {
  console.log('🌱 Seeding RAG knowledge base...');

  const embeddingModel = new EmbeddingModel();
  const vectorStore = new VectorStoreRepository();

  for (let i = 0; i < documents.length; i++) {
    const text = documents[i];
    const chunks = chunkDocument(text, 500);
    for (const chunk of chunks) {
      try {
        const embedding = await embeddingModel.encodeText(chunk);
        const doc = {
          id: uuidv4(),
          content: chunk,
          embedding: embedding,
          metadata: {
            companyId: 'system',
            contentType: 'KNOWLEDGE_BASE',
            sourceId: `doc-${i}`,
            timestamp: new Date(),
            tags: ['sop', 'logistics', 'training'],
          },
        };
        await vectorStore.insert(doc);
        console.log(`✅ Inserted chunk ${i+1}/${documents.length}`);
      } catch (err) {
        console.error(`❌ Failed to insert chunk ${i+1}:`, err);
      }
    }
  }

  console.log('🎉 Seeding complete!');
}

seedRAG().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
