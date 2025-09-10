import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"
import TelegramBot from "node-telegram-bot-api"
import fs from "fs"
import 'dotenv/config'

// ====== إعدادات البوت ======
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const OWNER_ID = parseInt(process.env.OWNER_ID)
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })

// ====== التحقق من جلسة واتساب ======
if (!fs.existsSync("./auth/creds.json")) {
  console.log("❌ ما في جلسة قديمة في مجلد auth/")
}

// ====== إعداد واتساب ======
let sock
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  sock = makeWASocket({ auth: state })
  sock.ev.on("creds.update", saveCreds)
  sock.ev.on("connection.update", (update) => {
    if (update.connection === "open") console.log("✅ تم الاتصال بالواتساب")
    if (update.connection === "close") console.log("⚠️ الاتصال مقفل")
  })
}
startWhatsApp()

// ====== استقبال رابط القروب ======
bot.on("message", async (msg) => {
  if (msg.from.id !== OWNER_ID) return
  const text = msg.text
  if (!text.startsWith("https://chat.whatsapp.com/")) return

  const inviteCode = text.split("/").pop().split("?")[0]

  try {
    // محاولة الانضمام (لو البوت مش عضو)
    await sock.groupAcceptInvite(inviteCode)
  } catch (e) {
    if (e.status !== 409) return bot.sendMessage(msg.chat.id, `❌ فشل الانضمام: ${e.message}`)
  }

  try {
    const groups = await sock.groupFetchAllParticipating()
    for (let id in groups) {
      if (groups[id].inviteCode === inviteCode) {
        bot.sendMessage(msg.chat.id, `✅ Group ID: ${id}`)
        return
      }
    }
    bot.sendMessage(msg.chat.id, "❌ لم أتمكن من العثور على Group ID")
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ خطأ: ${e.message}`)
  }
})
