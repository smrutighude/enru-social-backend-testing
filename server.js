const express = require('express');
const puppeteer = require('puppeteer');
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
const PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
app.use('/public', express.static(PUBLIC_DIR));

const LOGO_URL = "https://images.squarespace-cdn.com/content/v1/6463990b76ee7b2c5896a2ca/4ba436c6-a67b-4886-bebf-ea6fb801f964/Enru_Arrow_Citron.png";

app.post('/generate-social-post', async (req, res) => {
    let browser;
    try {
        const bodyData = req.body;
        const image_url = bodyData.image_url || "";
        const post_type = bodyData.post_type || "carousel";
        const incomingSlides = bodyData.slides || [];

        const isCarousel = post_type === "carousel";
        const totalSlides = incomingSlides.length || (isCarousel ? 5 : 1);

        let pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--ignore-certificate-errors']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        for (let i = 0; i < totalSlides; i++) {
            const slideData = incomingSlides[i] || { title: "Enru", explainer: "" };
            const translation = isCarousel ? (i * 100) : 0;
            const bgWidth = isCarousel ? (totalSlides * 100) : 100;

            const html = `
            <html>
            <head>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { width: 1280px; height: 720px; font-family: 'Arial'; background: #003F33; overflow: hidden; position: relative; }
                    .bg {
                        position: absolute; top: 0; left: -${translation}%;
                        width: ${bgWidth}%; height: 100%;
                        background: url('${image_url}') no-repeat center center;
                        background-size: cover; z-index: 1;
                    }
                    .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,63,51,0.1) 0%, rgba(0,63,51,0.8) 100%); z-index: 2; }
                    .content { position: relative; z-index: 3; padding: 60px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; color: white; }
                    .header { font-size: 54px; font-weight: 800; color: #B5B735; text-transform: uppercase; border-left: 8px solid #B5B735; padding-left: 20px; }
                    .body { font-size: 32px; font-weight: 400; line-height: 1.4; max-width: 900px; margin-top: 20px; color: #EDF2F2; }
                    .footer { display: flex; justify-content: space-between; align-items: center; }
                    .logo { height: 50px; }
                    .bar { width: 120px; height: 6px; background: #B5B735; }
                </style>
            </head>
            <body>
                <div class="bg"></div>
                <div class="overlay"></div>
                <div class="content">
                    <div>
                        <div class="header">${slideData.title}</div>
                        <div class="body">${slideData.explainer}</div>
                    </div>
                    <div class="footer">
                        <img class="logo" src="${LOGO_URL}">
                        <div class="bar"></div>
                    </div>
                </div>
            </body>
            </html>`;

            await page.setContent(html, { waitUntil: 'networkidle2' });
            const buffer = await page.screenshot({ type: 'jpeg', quality: 90 });
            let slide = pptx.addSlide();
            slide.addImage({ data: `image/jpeg;base64,${buffer.toString('base64')}`, x: 0, y: 0, w: 13.33, h: 7.5 });
        }

        const filename = `enru-export-${Date.now()}.pptx`;
        const filepath = path.join(PUBLIC_DIR, filename);
        await pptx.writeFile({ fileName: filepath });
        await browser.close();

        res.json({ download_url: `${req.protocol}://${req.get('host')}/public/${filename}` });
    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000);
