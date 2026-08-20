// خادم بسيط يوصل رقم واتساب حقيقي بمتجرك، ويستقبل طلبات إرسال أكواد التحقق (OTP)
// من الموقع (عبر Supabase Edge Function) ويبعتها فعليًا على واتساب العميل.
//
// التشغيل:
//   1) npm install
//   2) اعمل نسخة من .env.example باسم .env وحط فيه SHARED_SECRET (أي كلمة سر تختارها)
//   3) npm start
//   4) هيظهر رمز QR في الشاشة (Terminal) — افتح واتساب على موبايلك:
//      الإعدادات > الأجهزة المرتبطة > ربط جهاز > امسح الكود
//   5) بعد الربط، الخادم هيفضل شغال ويستقبل طلبات الإرسال

require('dotenv').config();
const express = require('express');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const PORT = process.env.PORT || 3000;
const SHARED_SECRET = process.env.SHARED_SECRET;

if (!SHARED_SECRET) {
  console.error('❌ لازم تحدد SHARED_SECRET في ملف .env قبل التشغيل (أي كلمة سر تختارها بنفسك).');
  process.exit(1);
}

const app = express();
app.use(express.json());

let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wa-session' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('\n📱 امسح كود QR ده من واتساب (الأجهزة المرتبطة > ربط جهاز):\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  isReady = true;
  console.log('✅ تم ربط واتساب بنجاح! الخادم جاهز لاستقبال طلبات الإرسال على المنفذ', PORT);
});

client.on('disconnected', (reason) => {
  isReady = false;
  console.error('⚠️ تم فصل واتساب:', reason, '— جرّب تشغّل الخادم تاني وامسح الكود من جديد.');
});

client.initialize();

// نقطة الوصول اللي بيستدعيها موقعك لإرسال كود التحقق
app.post('/send-otp', async (req, res) => {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${SHARED_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!isReady) {
    return res.status(503).json({ error: 'whatsapp_not_ready' });
  }

  const { phone, message } = req.body || {};
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' });
  }

  try {
    // رقم مصري محلي (01xxxxxxxxx) أو دولي بالفعل -> صيغة واتساب: 20xxxxxxxxxx@c.us
    const digits = String(phone).replace(/\D/g, '');
    const intl = digits.startsWith('20') ? digits : digits.startsWith('0') ? `20${digits.slice(1)}` : `20${digits}`;
    const chatId = `${intl}@c.us`;

    await client.sendMessage(chatId, message);
    return res.json({ success: true });
  } catch (err) {
    console.error('فشل الإرسال:', err);
    return res.status(500).json({ error: 'send_failed' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ready: isReady });
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم شغال على المنفذ ${PORT} — في انتظار ربط واتساب...`);
});
