const { Telegraf, Markup } = require('telegraf')

const BOT_TOKEN = '7655339410:AAGa2HZKvOldpQFp0ohOKPoesAmcB37KAQ0'
const CHANNEL_USERNAME = "bakhtiyorovk";
const ADMIN_ID = 1921972440;

const bot = new Telegraf(BOT_TOKEN)

const userState = new Map()
const userMessages = new Map()
const adminReplyState = new Map()

async function checkChannelMembership (ctx) {
  try {
    const member = await ctx.telegram.getChatMember(
      `@${CHANNEL_USERNAME}`,
      ctx.from.id
    )
    return ['member', 'administrator', 'creator'].includes(member.status)
  } catch (error) {
    console.error('Kanal tekshiruvida xatolik:', error)
    return false
  }
}

bot.command('start', async ctx => {
  if (ctx.from.id === ADMIN_ID) {
    return ctx.reply(
      '👋 Salom, Admin! Siz foydalanuvchilardan kelgan xabarlarga javob berishingiz mumkin.',
      {
        reply_markup: {
          keyboard: [["📨 Xabarlarni ko'rish"]],
          resize_keyboard: true
        }
      }
    )
  }

  try {
    const isMember = await checkChannelMembership(ctx)

    if (isMember) {
      await ctx.reply(
        '🌐 Tilni tanlang / Select language / Выберите язык:',
        Markup.inlineKeyboard([
          [
            Markup.button.callback("🇺🇿 O'zbekcha", 'language_uzbek'),
            Markup.button.callback('🇬🇧 English', 'language_english'),
            Markup.button.callback('🇷🇺 Русский', 'language_russian')
          ]
        ])
      )
    } else {
      await ctx.reply("🔔 Botdan foydalanish uchun kanalga obuna bo'ling!")
      await ctx.reply(
        `Botdan foydalanish uchun @${CHANNEL_USERNAME} kanaliga obuna bo'ling!`,
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              "🔔 Kanalga obuna bo'ling",
              `https://t.me/${CHANNEL_USERNAME}`
            )
          ],
          [Markup.button.callback("✅ Obuna bo'ldim", 'check_subscription')]
        ])
      )
    }
  } catch (error) {
    await ctx.reply("Tizimda muammo yuz berdi. Keyinroq urinib ko'ring.")
  }
})

bot.action('check_subscription', async ctx => {
  try {
    const isMember = await checkChannelMembership(ctx)

    if (isMember) {
      await ctx.answerCbQuery(`✅ ${ctx.from.first_name} muvaffaqiyatli obuna bo'ldingiz!`)
      await ctx.reply(`🎉 ${ctx.from.first_name} tabriklaymiz! Siz muvaffaqiyatli obuna bo'ldingiz`)
      await ctx.editMessageText(
        '🌐 Tilni tanlang / Select language / Выберите язык:',
        Markup.inlineKeyboard([
          [
            Markup.button.callback("🇺🇿 O'zbekcha", 'language_uzbek'),
            Markup.button.callback('🇬🇧 English', 'language_english'),
            Markup.button.callback('🇷🇺 Русский', 'language_russian')
          ]
        ])
      )
    } else {
      await ctx.answerCbQuery("❌ Siz hali kanalga obuna bo'lmagansiz!")
    }
  } catch (error) {
    console.error('Obuna tekshiruvida xatolik:', error)
    await ctx.answerCbQuery('Tizimda muammo yuz berdi.')
  }
})

bot.action(/^language_(.+)$/, async ctx => {
  const selectedLanguage = ctx.match[1]

  userState.set(ctx.from.id, { language: selectedLanguage })

  const messages = {
    uzbek: '📋 Suhbat turini tanlang:',
    english: '📋 Select chat type:',
    russian: '📋 Выберите тип чата:'
  }

  await ctx.editMessageText(
    messages[selectedLanguage],
    Markup.inlineKeyboard([
      [
        Markup.button.callback('👤 Personal', 'mode_personal'),
        Markup.button.callback('🕵️ Anonim', 'mode_anonim')
      ]
    ])
  )
})

bot.action(/^mode_(.+)$/, async ctx => {
  const selectedMode = ctx.match[1]
  const userLanguage = userState.get(ctx.from.id)?.language || 'uzbek'

  const currentState = userState.get(ctx.from.id) || {}
  userState.set(ctx.from.id, { ...currentState, mode: selectedMode })

  const messages = {
    uzbek: {
      personal: '👤 Personal suhbatni tanladingiz. Xabaringizni yuboring.',
      anonim: '🕵️ Anonim suhbatni tanladingiz. Xabaringizni yuboring.'
    },
    english: {
      personal: '👤 You selected personal chat. Send your message.',
      anonim: '🕵️ You selected anonymous chat. Send your message.'
    },
    russian: {
      personal: '👤 Вы выбрали личный чат. Отправьте сообщение.',
      anonim: '🕵️ Вы выбрали анонимный чат. Отправьте сообщение.'
    }
  }

  await ctx.editMessageText(messages[userLanguage][selectedMode])
})

bot.on('text', async ctx => {
  if (ctx.from.id === ADMIN_ID) {
    if (ctx.message.text === "📨 Xabarlarni ko'rish") {
      return ctx.reply("Hozircha yangi xabarlar yo'q.")
    }

    const replyToUserId = adminReplyState.get(ctx.from.id)
    if (replyToUserId) {
      try {
        await ctx.telegram.sendMessage(
          replyToUserId,
          `Admin javobi: ${ctx.message.text}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    'Javob berish',
                    `user_reply_${ctx.from.id}`
                  )
                ]
              ]
            }
          }
        )
        await ctx.reply('Javob yuborildi.')
        adminReplyState.delete(ctx.from.id)
      } catch (error) {
        console.error('Javob yuborishda xatolik:', error)
        await ctx.reply('Javob yuborishda xatolik yuz berdi.')
      }
    } else {
      await ctx.reply('Iltimos, avval "Javob berish" tugmasini bosing.')
    }
    return
  }

  const userCurrentState = userState.get(ctx.from.id)

  if (!userCurrentState) {
    return ctx.reply("Iltimos, avval /start buyrug'ini bosing.")
  }

  const { language, mode } = userCurrentState

  const messageId = Date.now().toString()
  const formattedMessage =
    mode === 'personal'
      ? `📬 <b>Yangi Personal Xabar</b>\n\n` +
        `👤 Ism: ${ctx.message.from.first_name} ${
          ctx.message.from.last_name || ''
        }\n` +
        `🆔 ID: ${ctx.from.id}\n` +
        `📧 Username: ${
          ctx.from.username ? '@' + ctx.from.username : "Yo'q"
        }\n\n` +
        `💬 Xabar: <code>${ctx.message.text}</code>`
      : `📬 <b>Yangi Anonim Xabar</b>\n\n` +
        `💬 Xabar: <code>${ctx.message.text}</code>`

  try {
    await ctx.telegram.sendMessage(ADMIN_ID, formattedMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('Javob berish', `reply_${ctx.from.id}`)]
        ]
      }
    })

    if (!userMessages.has(ctx.from.id)) {
      userMessages.set(ctx.from.id, [])
    }
    userMessages.get(ctx.from.id).push({ messageId, text: ctx.message.text })

    const messages = {
      uzbek: '✅ Xabaringiz Kamronga yuborildi.',
      english: '✅ Your message has been sent to the Kamron.',
      russian: '✅ Ваше сообщение было отправлено в Kamron.'
    }

    await ctx.reply(messages[language])
  } catch (error) {
    await ctx.reply('Xabarni yuborishda muammo yuz berdi.')
  }
})

bot.action(/^reply_(\d+)$/, async ctx => {
  const userId = ctx.match[1]
  await ctx.answerCbQuery()
  adminReplyState.set(ctx.from.id, userId)
  await ctx.reply(`Iltimos, foydalanuvchiga javobingizni yozing:`)
})

bot.action(/^user_reply_(\d+)$/, async ctx => {
  const adminId = ctx.match[1]
  await ctx.answerCbQuery()
  userState.set(ctx.from.id, {
    ...userState.get(ctx.from.id),
    replyToAdmin: adminId
  })
  await ctx.reply('Iltimos, adminga javobingizni yozing:')
})


bot
  .launch()
  .then(() => {
    console.log('Bot muvaffaqiyatli ishga tushdi')
  })
  .catch(err => {
    console.error('Botni ishga tushirishda error yuzaga keldi: ', err)
  })

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
