
export default async function handler(req, res) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({
        error: "Telegram məlumatları əlavə edilməyib"
      });
    }

    const rssUrl =
      "https://news.google.com/rss?hl=az&gl=AZ&ceid=AZ:az";

    const response = await fetch(rssUrl);
    if (!response.ok) throw new Error("Xəbər mənbəyi açılmadı");

    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    const decode = (s) => s
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    const getTag = (item, tag) => {
      const match = item.match(
        new RegExp(`<${tag}[^>]*>([\\\\s\\\\S]*?)</${tag}>`)
      );
      return match ? decode(match[1].trim()) : "";
    };

    const news = items.slice(0, 10).map((match, i) => {
      const item = match[1];
      return `${i + 1}. ${getTag(item, "title")}\n${getTag(item, "link")}`;
    });

    if (!news.length) throw new Error("Xəbər tapılmadı");

    const message =
      "🌍 WORLD NEWS AZ\n" +
      "🗞 Günün əsas 10 xəbəri\n\n" +
      news.join("\n\n");

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          disable_web_page_preview: true
        })
      }
    );

    const result = await telegramResponse.json();
    if (!result.ok) throw new Error("Telegram mesajı göndərmədi");

    return res.status(200).json({
      success: true,
      sent: news.length
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
