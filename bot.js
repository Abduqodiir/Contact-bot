import { Telegraf } from 'telegraf';
import ytdl from 'ytdl-core';
import axios from 'axios';
import fs from 'fs';

const bot = new Telegraf('8056505497:AAE1tCHIPK8Tac8T1JMQEZSjdhab5s-sqd4');

bot.start((ctx) => ctx.reply('Welcome! Send me a YouTube, Instagram, or TikTok link, and I\'ll send you the media.'));

bot.on('text', async (ctx) => {
  const url = ctx.message.text;

  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      await handleYouTube(ctx, url);
    } else if (url.includes('instagram.com')) {
      await handleInstagram(ctx, url);
    } else if (url.includes('tiktok.com')) {
      await handleTikTok(ctx, url);
    } else {
      ctx.reply('Please send a valid YouTube, Instagram, or TikTok link.');
    }
  } catch (error) {
    console.error('Error:', error);
    ctx.reply('Sorry, there was an error processing your request.');
  }
});

async function handleYouTube(ctx, url) {
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
    
    const fileName = `youtube_${Date.now()}.mp4`;
    const writeStream = fs.createWriteStream(fileName);
    
    ytdl(url, { format: format }).pipe(writeStream);
    
    writeStream.on('finish', async () => {
      await ctx.replyWithVideo({ source: fileName });
      fs.unlinkSync(fileName);
    });
  } catch (error) {
    console.error('YouTube download error:', error);
    ctx.reply('Sorry, there was an error downloading the YouTube video.');
  }
}

async function handleInstagram(ctx, url) {
  try {
    const response = await axios.get(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`);
    const mediaId = response.data.media_id;
    const mediaUrl = `https://www.instagram.com/p/${mediaId}/media/?size=l`;
    await ctx.replyWithPhoto({ url: mediaUrl });
  } catch (error) {
    console.error('Instagram download error:', error);
    ctx.reply('Sorry, there was an error downloading the Instagram media.');
  }
}

async function handleTikTok(ctx, url) {
  try {
    const response = await axios.get(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    const videoUrl = response.data.thumbnail_url.replace('_r.jpeg', '.mp4');
    await ctx.replyWithVideo({ url: videoUrl });
  } catch (error) {
    console.error('TikTok download error:', error);
    ctx.reply('Sorry, there was an error downloading the TikTok video.');
  }
}

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));