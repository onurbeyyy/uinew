import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const BACKEND_API_URL = process.env.API_URL || 'https://canlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, customerCode, sessionId, menuData, pageUrl } = body;

    if (!message || !customerCode) {
      return NextResponse.json(
        { success: false, error: 'Message and customerCode are required' },
        { status: 400 }
      );
    }

    console.log('🔍 AI Chat API - Request:', {
      message: message.substring(0, 50),
      customerCode,
      sessionId,
      menuDataLength: menuData?.length || 0,
      pageUrl
    });

    // 1. İlk olarak backend Chat API'ye dene
    try {
      const backendResponse = await fetch(`${BACKEND_API_URL}/api/Chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          customerCode,
          sessionId: sessionId || `session_${Date.now()}`,
          pageUrl: pageUrl || '',
          menuData: menuData || '',
        }),
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();

        console.log('✅ Backend response:', {
          hasResponse: !!data.response,
          remainingMessages: data.remainingMessages,
          rateLimited: data.rateLimited,
          fallback: data.fallback
        });

        // Rate limit kontrolü
        if (data.rateLimited) {
          return NextResponse.json({
            success: true,
            response: data.response,
            remainingMessages: data.remainingMessages || 0,
            rateLimited: true,
          });
        }

        // Backend fallback flag kontrolü
        if (data.fallback) {
          console.log('⚠️ Backend returned fallback flag');
          throw new Error('Backend fallback - switching to Gemini');
        }

        return NextResponse.json({
          success: true,
          response: data.response,
          remainingMessages: data.remainingMessages || 30,
          source: 'backend',
        });
      } else {
        console.error('❌ Backend response not OK:', backendResponse.status);
        throw new Error(`Backend API error: ${backendResponse.status}`);
      }
    } catch (backendError) {
      console.log('⚠️ Backend Chat API failed, falling back to Gemini:', backendError);
      // Gemini'ye geç
    }

    // 2. Backend başarısız olursa Gemini'yi kullan
    try {
      console.log('🔄 Falling back to Gemini AI');

      // Prepare menu data string for Gemini
      let menuDataStr = '';
      if (menuData) {
        try {
          const menuObj = typeof menuData === 'string' ? JSON.parse(menuData) : menuData;
          if (menuObj && menuObj.categories) {
            menuObj.categories.forEach((cat: any) => {
              // Check if this is the format from the page (with subCategories)
              if (cat.subCategories && cat.subCategories[0]?.products) {
                menuDataStr += `\n${cat.title}:\n`;
                cat.subCategories[0].products.forEach((p: any) => {
                  menuDataStr += `  - ${p.title}`;
                  if (p.price > 0) menuDataStr += ` (${p.price}₺)`;
                  if (p.detail) menuDataStr += ` - ${p.detail}`;
                  menuDataStr += '\n';
                });
              }
              // Or the format from our own loading (direct products)
              else if (cat.products && cat.products.length > 0) {
                menuDataStr += `\n${cat.title}:\n`;
                cat.products.forEach((p: any) => {
                  menuDataStr += `  - ${p.title}`;
                  if (p.price > 0) menuDataStr += ` (${p.price}₺)`;
                  if (p.detail) menuDataStr += ` - ${p.detail}`;
                  menuDataStr += '\n';
                });
              }
            });
          }
        } catch (e) {
          console.error('Error parsing menu data:', e);
        }
      }

      // Customer context oluştur
      const customerInfoResponse = await fetch(
        `${BACKEND_API_URL}/api/Customer/CustomerInfoByCode?code=${customerCode}`
      );

      let context = `Sen bir restoran menü asistanısın.\n`;

      if (customerInfoResponse.ok) {
        const customerInfo = await customerInfoResponse.json();
        context = `Sen ${customerInfo.name} restoranının menü asistanısın.\n`;
        context += `RESTORAN BİLGİLERİ (Bu bilgileri kullan):\n`;
        context += `- İşletme Adı: ${customerInfo.name}\n`;
        context += `- Telefon: ${customerInfo.phone || 'Belirtilmemiş'}\n`;
        context += `- Adres/Konum: ${customerInfo.location || 'Belirtilmemiş'}\n`;
        context += `- Instagram: ${customerInfo.instagramUrl || 'Belirtilmemiş'}\n`;
        context += `- WhatsApp: ${customerInfo.whatsApp || 'Belirtilmemiş'}\n`;
        context += `- Fiyat Gösterimi: ${customerInfo.showPrices ? 'Evet' : 'Hayır'}\n\n`;

        context += `KONUM/ADRES SORUSU CEVABI: Kullanıcı konum, adres, nerede sorduğunda yukarıdaki Adres/Konum bilgisini ver\n`;
        context += `INSTAGRAM SORUSU CEVABI: Instagram, sosyal medya sorduğunda yukarıdaki Instagram bilgisini ver\n`;
        context += `TELEFON SORUSU CEVABI: Telefon, iletişim sorduğunda yukarıdaki Telefon bilgisini ver\n`;
        context += `REZERVASYON SORUSU CEVABI: Kullanıcı rezervasyon, masa, randevu sorduğunda:\n`;
        context += `"Rezervasyon için bizi arayabilirsiniz: ${customerInfo.phone || 'Telefon bilgisi bulunamadı'}\n`;
        context += `📞 Telefon: ${customerInfo.phone || 'Belirtilmemiş'}\n`;
        if (customerInfo.whatsApp) {
          context += `📱 WhatsApp: ${customerInfo.whatsApp}\n`;
        }
        context += `Rezervasyon yapmak istediğiniz tarihi ve kişi sayısını belirterek arayın!" şeklinde cevap ver\n\n`;

        context += `ÖZEL İÇECEK ÖNERİ SİSTEMİ:\n`;
        context += `Kullanıcı "tatlı kokteyl", "tatlı içecek", "kokteyl öner", "ne içsem", "enerji içecek", "redbull" gibi sorular sorduğunda:\n`;
        context += `1. Önce menüdeki TÜM içecekleri kontrol et\n`;
        context += `2. İstek tipine uygun 2-3 ürün seç:\n`;
        context += `   - Tatlı istek: Şarap, kokteyl, tatlı likör, meyve suyu, milkshake\n`;
        context += `   - Alkollü istek: Kokteyl, viski, şarap, likör, gin tonik\n`;
        context += `   - Soğuk istek: Soğuk kahve, buz çayı, smoothie, gazlı içecek\n`;
        context += `   - Sıcak istek: Kahve, çay, sıcak çikolata, türk kahvesi\n`;
        context += `   - Enerji istek: Redbull, Monster, enerji içeceği, kahve, espresso\n`;
        context += `3. Her önerdiğin ürün için NEDEN önerdiğini açıkla\n`;
        context += `4. Format: "• Ürün Adı (Fiyat TL) - Neden açıklaması"\n`;
        context += `5. ASLA menüde olmayan ürün önerme!\n\n`;

        context += `ÖZEL SORULAR:\n`;
        context += `"Neler yapabilirsin?", "Ne yapıyorsun?", "Nasıl yardım edebilirsin?" sorulduğunda:\n`;
        context += `"Size şunlarda yardımcı olabilirim: 📋 Menü kategorilerini listeleme, 💰 Ürün fiyat bilgileri, 🍽️ Menü önerileri verme, 📞 Telefon ve iletişim bilgileri, 📱 Instagram ve sosyal medya, 🍷 İçecek önerileri"\n\n`;

        context += `MENÜ DIŞI SORULAR:\n`;
        context += `"Canlı müzik", "etkinlik", "program", "açılış saatleri", "rezervasyon şartları" gibi sorularda:\n`;
        context += `"Bu konuda detaylı bilgi için işletmeyi arayabilir veya sosyal medya hesaplarını takip edebilirsiniz" de\n`;
        context += `ASLA önce "bilgi verebilirim" deyip sonra "menüde yok" deme!\n\n`;

        context += `FİX MENÜ SORU KURALLARI:\n`;
        context += `Kullanıcı "fix menü", "set menü", "paket menü", "uygun menü" sorduğunda:\n`;
        context += `1. ÖNCELİKLE menü kategorilerinde "FİX MENULER" kategorisi var mı kontrol et\n`;
        context += `2. Fix menü kategorisi VARSA: SADECE o kategorideki hazır menüleri listele\n`;
        context += `3. Fix menü kategorisi YOKSA: "Şu anda fix menü seçeneğimiz bulunmuyor" de\n`;
        context += `4. ASLA olmayan fix menü uydurma! ASLA farklı kategorilerden ürün toplayıp fix menü oluşturma!\n`;
        context += `5. ASLA rastgele fiyat uydurma! Sadece menüdeki gerçek fiyatları kullan\n\n`;

        context += `GENEL ÖNERI KURALLARI:\n`;
        context += `"Kız kız takılıcaz", "arkadaş", "eğlence" gibi genel sorularda:\n`;
        context += `1. Farklı kategorilerden uygun ürünler önerebilirsin\n`;
        context += `2. Meze, ana yemek, tatlı, içecek kombinasyonu yap\n`;
        context += `3. Sadece menüdeki gerçek ürünleri kullan\n`;
        context += `4. Format: "• Ürün (Fiyat TL)" ve sonunda "Toplam: X TL"\n\n`;

        context += `KİŞİ SAYISI FİYAT KURALLARI:\n`;
        context += `Kullanıcı "2 kişi", "3 kişi", "4 kişi" vs. belirttiğinde:\n`;
        context += `1. Menüdeki fiyatlar TEK KİŞİLİKTİR\n`;
        context += `2. Kişi sayısı kadar ÇARP: 2 kişi = fiyat x2, 3 kişi = fiyat x3\n`;
        context += `3. Örnek: "Karışık Meze (120₺)" → 2 kişi için: "Karışık Meze (240₺ - 2 kişi için)"\n`;
        context += `4. Toplam hesaplarken çarpılmış fiyatları kullan\n`;
        context += `5. Kişi başı bilgi vermek istersen: "120₺ x 2 kişi = 240₺" şeklinde açıkla\n\n`;

        if (!customerInfo.showPrices) {
          context += `DİKKAT: Fiyatları sadece müşteri özellikle isterse göster.\n\n`;
        }
      }

      // Menü verisini ekle
      if (menuDataStr) {
        context += `GERÇEK MENÜ VERİLERİ (SADECE BUNLARI KULLAN):\n${menuDataStr}\n\n`;
      }

      context += `KRİTİK UYARI: ASLA menüde olmayan ürün uydurma! SADECE yukarıdaki gerçek menü verilerini kullan. Eğer ürün yoksa 'Bu ürün menümüzde yok' de!\n\n`;
      context += `Müşteri sorusu: ${message}`;

      console.log('📝 Context prepared. Menu data length:', menuDataStr.length);

      const requestBody = {
        contents: [
          {
            parts: [{ text: context }],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Daha tutarlı
          topK: 10, // Daha odaklı
          topP: 0.8, // Daha güvenli
          maxOutputTokens: 1024,
        },
      };

      const geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(20000), // 20 second timeout
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('❌ Gemini API error:', geminiResponse.status, errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      console.log('✅ Gemini response received:', JSON.stringify(geminiData).substring(0, 200));

      if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts?.[0]?.text) {
        console.error('❌ Invalid Gemini response structure:', geminiData);
        throw new Error('Invalid Gemini response structure');
      }

      const aiResponse = geminiData.candidates[0].content.parts[0].text;

      // Analytics log (fire and forget)
      try {
        await fetch(`${BACKEND_API_URL}/api/ChatAnalytics/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerCode,
            customerName: '',
            userMessage: message,
            aiResponse,
            sessionId: sessionId || `session_${Date.now()}`,
            pageUrl: request.nextUrl.href,
          }),
        });
      } catch (logError) {
        // Silent fail for analytics
      }

      return NextResponse.json({
        success: true,
        response: aiResponse,
        remainingMessages: 30, // Default for Gemini fallback
        source: 'gemini',
      });
    } catch (geminiError) {
      console.error('Gemini API failed:', geminiError);
      throw geminiError;
    }
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Şu anda teknik bir sorun yaşıyoruz. Lütfen birkaç dakika sonra tekrar deneyin.',
      response:
        'Şu anda teknik bir sorun yaşıyoruz. Lütfen birkaç dakika sonra tekrar deneyin.',
    });
  }
}
