import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const BACKEND_API_URL = process.env.API_URL || 'https://apicanlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, customerCode, sessionId, menuData, pageUrl, tableId, isTableMode, conversationHistory } = body;

    if (!message || !customerCode) {
      return NextResponse.json(
        { success: false, error: 'Message and customerCode are required' },
        { status: 400 }
      );
    }

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
    } catch {
      // Backend failed, fallback to Gemini
    }

    // 2. Backend başarısız olursa Gemini'yi kullan
    try {
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
        } catch {
          // Failed to parse menu data
        }
      }

      // Customer context oluştur
      const customerInfoResponse = await fetch(
        `${BACKEND_API_URL}/api/Customer/CustomerInfoByCode?code=${customerCode}`
      );

      let context = `Sen bir restoran menü asistanısın.\n`;

      if (customerInfoResponse.ok) {
        const customerInfoData = await customerInfoResponse.json();
        const customerInfo = customerInfoData.customer || customerInfoData; // nested veya flat yapıyı destekle
        context = `Sen ${customerInfo.name || 'Restoran'} restoranının menü asistanısın.\n`;
        context += `\n🌍 DİL KURALI (ÇOK ÖNEMLİ!):\n`;
        context += `- Müşteri hangi dilde yazıyorsa, SEN DE O DİLDE CEVAP VER!\n`;
        context += `- İngilizce soru = İngilizce cevap\n`;
        context += `- Türkçe soru = Türkçe cevap\n`;
        context += `- Almanca soru = Almanca cevap\n`;
        context += `- Arapça soru = Arapça cevap\n`;
        context += `- Rusça soru = Rusça cevap\n`;
        context += `- Diğer diller için de aynı kural geçerli!\n`;
        context += `- Ürün isimleri orijinal kalabilir ama açıklamalar müşterinin dilinde olmalı.\n\n`;
        context += `RESTORAN BİLGİLERİ (Bu bilgileri kullan):\n`;
        context += `- İşletme Adı: ${customerInfo.name || 'Belirtilmemiş'}\n`;
        context += `- Telefon: ${customerInfo.phone || 'Belirtilmemiş'}\n`;
        context += `- Adres/Konum: ${customerInfo.location || 'Belirtilmemiş'}\n`;
        context += `- Instagram: ${customerInfo.instagramUrl || 'Belirtilmemiş'}\n`;
        context += `- WhatsApp: ${customerInfo.whatsApp || 'Belirtilmemiş'}\n`;
        context += `- Fiyat Gösterimi: ${customerInfo.showPrices ? 'Evet' : 'Hayır'}\n\n`;

        context += `[İÇ KURAL - KULLANICIYA GÖSTERME]\n`;
        context += `Konum/adres sorulursa → "${customerInfo.location || 'Belirtilmemiş'}" bilgisini ver\n`;
        context += `Instagram sorulursa → "${customerInfo.instagramUrl || 'Belirtilmemiş'}" bilgisini ver\n`;
        context += `Telefon sorulursa → "📞 ${customerInfo.phone || 'Belirtilmemiş'}" yaz\n`;
        context += `Rezervasyon sorulursa → "Rezervasyon için: 📞 ${customerInfo.phone || ''}"`;
        if (customerInfo.whatsApp) {
          context += ` veya 📱 WhatsApp: ${customerInfo.whatsApp}`;
        }
        context += ` yaz\n`;
        context += `[/İÇ KURAL]\n\n`;

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

        context += `⚠️ KİŞİ SAYISI FİYAT KURALLARI (ÇOK ÖNEMLİ!):\n`;
        context += `Kullanıcı "2 kişi", "3 kişi", "4 kişi" vs. belirttiğinde MUTLAKA UYGULA:\n\n`;
        context += `PAYLAŞIMLIK ÜRÜNLER (1 porsiyon yeterli):\n`;
        context += `- Mezeler, salatalar → 1 porsiyon fiyatı yaz\n`;
        context += `- Tatlılar → paylaşılabilir, 1 porsiyon yeterli\n\n`;
        context += `KİŞİLİK ÜRÜNLER (her kişi için ayrı hesapla):\n`;
        context += `- ANA YEMEKLER → Kişi sayısı kadar porsiyon! 2 kişi = 2x fiyat\n`;
        context += `- İÇECEKLER → Kişi sayısı kadar! 2 kişi = 2x fiyat\n`;
        context += `- Çorbalar → Kişi sayısı kadar! 2 kişi = 2x fiyat\n\n`;
        context += `ÖRNEK (2 kişi için öneri):\n`;
        context += `• Karışık Meze - 120₺ (paylaşımlık)\n`;
        context += `• Hünkar Beğendi - 185₺ x 2 = 370₺ (2 porsiyon)\n`;
        context += `• Ayran - 25₺ x 2 = 50₺ (2 adet)\n`;
        context += `• Künefe - 95₺ (paylaşımlık)\n`;
        context += `TOPLAM: 635₺\n\n`;
        context += `FORMAT KURALI: Ana yemek ve içeceklerde "fiyat x kişi sayısı = toplam" yaz!\n\n`;

        if (!customerInfo.showPrices) {
          context += `DİKKAT: Fiyatları sadece müşteri özellikle isterse göster.\n\n`;
        }
      }

      // Menü verisini ekle
      if (menuDataStr) {
        context += `GERÇEK MENÜ VERİLERİ (SADECE BUNLARI KULLAN):\n${menuDataStr}\n\n`;
      }

      context += `KRİTİK UYARI: ASLA menüde olmayan ürün uydurma! SADECE yukarıdaki gerçek menü verilerini kullan. Eğer ürün yoksa 'Bu ürün menümüzde yok' de!\n\n`;

      // Sipariş algılama prompt'u - sadece masa modunda
      if (isTableMode && tableId) {
        context += `\n═══════════════════════════════════════════════════════════\n`;
        context += `SİPARİŞ ALGILAMA SİSTEMİ (MASA MODU AKTİF - Masa: ${tableId})\n`;
        context += `═══════════════════════════════════════════════════════════\n\n`;

        context += `🚫 BU SORULAR SİPARİŞ DEĞİL (ACTION EKLEME!):\n`;
        context += `   - "X var mı?", "X'iniz var mı?" → BİLGİ SORUSU, sadece cevap ver\n`;
        context += `   - "X ne kadar?", "X kaç TL?", "fiyatı?" → FİYAT SORUSU\n`;
        context += `   - "X'te ne var?", "X kategorisi" → MENÜ SORUSU\n`;
        context += `   - "X öneri", "ne önerirsin?" → ÖNERİ İSTEĞİ\n\n`;

        context += `✅ GERÇEK SİPARİŞ NİYETLERİ:\n`;
        context += `   - "X istiyorum", "X alayım", "X sipariş ediyorum" → SİPARİŞ\n`;
        context += `   - "X ekle", "X ver", "X getir" → SİPARİŞ\n`;
        context += `   - "2 tane X", "bir porsiyon X" → SİPARİŞ\n`;
        context += `   - "evet", "ekle", "tamam" (önceki üründen sonra) → ONAY\n\n`;

        context += `🔢 MİKTAR ALGILAMA (ÇOK ÖNEMLİ!):\n`;
        context += `   - "2 çay" → quantity: 2\n`;
        context += `   - "3 tane kahve" → quantity: 3\n`;
        context += `   - "iki su" → quantity: 2\n`;
        context += `   - "bir latte" → quantity: 1\n`;
        context += `   - Miktar belirtilmezse → quantity: 1\n`;
        context += `   ⚠️ Müşterinin söylediği miktarı MUTLAKA quantity alanına yaz!\n\n`;

        context += `📋 ÇOKLU ÜRÜN SİPARİŞİ:\n`;
        context += `   "2 çay 1 kahve" gibi siparişlerde:\n`;
        context += `   - SADECE İLK ürün için CONFIRM_ORDER döndür (quantity ile birlikte)\n`;
        context += `   - Diğer ürünleri mesajda belirt: "Önce 2 adet Çay için onay alayım, sonra Kahve için soracağım"\n`;
        context += `   - İlk ürün tamamlandıktan sonra otomatik olarak sonraki ürünü sor\n\n`;

        context += `📋 SİPARİŞ AKIŞI (SIRASI ÖNEMLİ!):\n`;
        context += `1. Müşteri sipariş niyeti gösterirse → ÖNCE ONAY SOR!\n`;
        context += `   Örnek: "2 adet Türk Çayı sepetinize eklensin mi? 🛒"\n\n`;
        context += `2. Müşteri "evet", "ekle", "tamam" derse → NASIL OLSUN SOR!\n`;
        context += `   Örnek: "Nasıl olsun? (Açık/Koyu, Şekerli/Şekersiz vb.)"\n\n`;
        context += `3. Müşteri tercihini belirtirse → SEPETE EKLE + ACTION DÖNDÜR\n`;
        context += `   Not bilgisini orderNote alanına ekle\n\n`;

        context += `⚡ NOT ZATEN VERİLMİŞSE (ÖNEMLİ!):\n`;
        context += `   "2 çay açık olsun", "1 kahve sade" gibi siparişlerde:\n`;
        context += `   - Müşteri zaten tercihi belirtmiş (açık, sade, şekersiz vb.)\n`;
        context += `   - CONFIRM_ORDER action'ına orderNote ekle!\n`;
        context += `   - Örnek: {"type":"CONFIRM_ORDER","productTitle":"Türk Çayı","quantity":2,"orderNote":"açık"}\n`;
        context += `   - Mesaj: "2 adet Türk Çayı (açık) sepetinize eklensin mi? 🛒"\n`;
        context += `   - Onaydan sonra TEKRAR "nasıl olsun" SORMA, direkt ekle!\n\n`;

        context += `⚡ HIZLI SİPARİŞ (not gerektirmeyen ürünler):\n`;
        context += `   - Su, Kola, Ayran gibi basit içecekler\n`;
        context += `   - Ana yemekler (genelde not gerekmez)\n`;
        context += `   Bu ürünler için sadece onay sor, not sorma.\n\n`;

        context += `🍵 NOT GEREKTİREN ÜRÜNLER:\n`;
        context += `   - Çay (Açık/Koyu, Şekerli/Şekersiz, Demli/Açık)\n`;
        context += `   - Kahve (Şekerli/Sade/Az Şekerli, Sütlü/Sütsüz)\n`;
        context += `   - Türk Kahvesi (Sade/Orta/Şekerli)\n`;
        context += `   - Et yemekleri (Az pişmiş/Orta/İyi pişmiş)\n\n`;

        context += `ACTION FORMAT (SADECE ONAY ALINDIKTAN SONRA!):\n`;
        context += `|||ACTION|||{"type":"ADD_TO_CART","productTitle":"Türk Çayı","quantity":2,"orderNote":"açık şekersiz"}|||END_ACTION|||\n`;
        context += `⚠️ quantity değerini müşterinin istediği GERÇEK miktarla doldur!\n\n`;

        context += `ONAY BEKLEME (sepete ekleme önerisi):\n`;
        context += `|||ACTION|||{"type":"CONFIRM_ORDER","productTitle":"Türk Çayı","quantity":2}|||END_ACTION|||\n`;
        context += `⚠️ "2 çay" denilince quantity:2 olmalı, "3 kahve" denilince quantity:3 olmalı!\n\n`;

        context += `NOT SORMA:\n`;
        context += `|||ACTION|||{"type":"ASK_NOTE","productTitle":"Türk Kahvesi","quantity":1,"noteOptions":["Sade","Orta","Şekerli"]}|||END_ACTION|||\n\n`;

        context += `📦 ÇOKLU ÜRÜN EKLEME ("bunları ekle", "hepsini ekle"):\n`;
        context += `   - Önceki mesajda ürün önerdiysen ve müşteri "bunları ekle" derse:\n`;
        context += `   - TÜM ürünleri MULTI_CONFIRM action ile döndür!\n`;
        context += `   - Mesaj: "Tüm ürünleri sırayla ekleyeceğim. İlk olarak Hünkar Beğendi..."\n`;
        context += `   - Format:\n`;
        context += `|||ACTION|||{"type":"MULTI_CONFIRM","products":[{"productTitle":"Hünkar Beğendi","quantity":2},{"productTitle":"Karışık Meze","quantity":1},{"productTitle":"Ayran","quantity":2},{"productTitle":"Künefe","quantity":1}]}|||END_ACTION|||\n\n`;

        context += `🛒 SEPET YÖNETİMİ KOMUTLARI (ÇOK ÖNEMLİ!):\n`;
        context += `   Bu komutlar YENİ SİPARİŞ DEĞİL, mevcut sepeti yönetmek içindir!\n\n`;
        context += `   - "sepetimde ne var?", "sepeti göster", "sepet" → VIEW_CART\n`;
        context += `   - "sepeti temizle", "sepeti boşalt" → CLEAR_CART\n`;
        context += `   - "siparişi gönder", "siparişi onayla", "sipariş ver", "onayla", "gönder" → SUBMIT_ORDER\n\n`;
        context += `   ⚠️ "siparişi gönder" = Sepetteki ürünleri mutfağa gönder (yeni sipariş DEĞİL!)\n\n`;

        context += `SEPET ACTION FORMATLARI:\n`;
        context += `|||ACTION|||{"type":"VIEW_CART"}|||END_ACTION|||\n`;
        context += `Mesaj: "Sepetinizi kontrol ediyorum..."\n\n`;
        context += `|||ACTION|||{"type":"CLEAR_CART"}|||END_ACTION|||\n`;
        context += `Mesaj: "Sepetiniz temizleniyor..."\n\n`;
        context += `|||ACTION|||{"type":"SUBMIT_ORDER"}|||END_ACTION|||\n`;
        context += `Mesaj: "Siparişiniz hazırlanıyor..."\n\n`;

        context += `⚠️ KRİTİK KURALLAR:\n`;
        context += `- "var mı?" sorusuna ASLA ACTION ekleme!\n`;
        context += `- Onay almadan ASLA ADD_TO_CART action'ı döndürme!\n`;
        context += `- productTitle menüdeki gerçek ürün adıyla TAMAMEN AYNI olmalı\n`;
        context += `- "siparişi gönder/onayla/ver" = SUBMIT_ORDER action (yeni sipariş DEĞİL!)\n`;
        context += `═══════════════════════════════════════════════════════════\n\n`;
      }

      // Sohbet geçmişini ekle (son mesajlar)
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        context += `\n📜 SON SOHBET GEÇMİŞİ (ÖNCEKİ MESAJLAR):\n`;
        conversationHistory.forEach((msg: { role: string; content: string }) => {
          const role = msg.role === 'user' ? 'Müşteri' : 'Sen';
          context += `${role}: ${msg.content}\n`;
        });
        context += `\n⚠️ Yukarıdaki sohbeti HATIRLA! "bunları ekle" denirse önceki önerdiğin ürünleri sepete ekle!\n\n`;
      }

      context += `Müşteri sorusu: ${message}`;

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

      if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid Gemini response structure');
      }

      let aiResponse = geminiData.candidates[0].content.parts[0].text;

      // Parse action from AI response
      let action = null;
      const actionMatch = aiResponse.match(/\|\|\|ACTION\|\|\|([\s\S]*?)\|\|\|END_ACTION\|\|\|/);
      if (actionMatch) {
        try {
          const actionData = JSON.parse(actionMatch[1]);

          // Ürün bilgilerini menuData'dan bul (tüm action type'ları için)
          const findProduct = (productTitle: string) => {
            if (!menuData || !productTitle) return null;
            const menuObj = typeof menuData === 'string' ? JSON.parse(menuData) : menuData;

            if (menuObj && menuObj.categories) {
              for (const cat of menuObj.categories) {
                const products = cat.products || (cat.subCategories?.[0]?.products) || [];
                for (const p of products) {
                  const pTitle = (p.title || p.Title || '').toLowerCase().trim();
                  const searchTitle = productTitle.toLowerCase().trim();

                  if (pTitle === searchTitle || pTitle.includes(searchTitle) || searchTitle.includes(pTitle)) {
                    return {
                      id: p.id || p.Id || 0,
                      sambaId: p.sambaId || p.SambaId || 0,
                      title: p.title || p.Title || productTitle,
                      price: p.price || p.Price || 0,
                      portions: (p.portions || p.Portions || []).map((por: any) => ({
                        id: por.id,
                        sambaPortionId: por.sambaPortionId,
                        name: por.name,
                        price: por.price
                      }))
                    };
                  }
                }
              }
            }
            return null;
          };

          // Action type'a göre işle
          if (actionData.type === 'ADD_TO_CART' && actionData.productTitle) {
            const foundProduct = findProduct(actionData.productTitle);

            if (foundProduct) {
              // Birden fazla porsiyon varsa ASK_PORTION action'ı oluştur
              if (foundProduct.portions && foundProduct.portions.length > 1 && !actionData.portionName) {
                action = {
                  type: 'ASK_PORTION',
                  product: foundProduct,
                  quantity: actionData.quantity || 1,
                  orderNote: actionData.orderNote
                };
              } else {
                action = {
                  type: 'ADD_TO_CART',
                  product: foundProduct,
                  quantity: actionData.quantity || 1,
                  portionName: actionData.portionName,
                  orderNote: actionData.orderNote
                };
              }
            } else {
              action = {
                type: 'PRODUCT_NOT_FOUND',
                message: `"${actionData.productTitle}" menüde bulunamadı.`
              };
            }
          } else if (actionData.type === 'CONFIRM_ORDER' && actionData.productTitle) {
            // Onay bekleme - ürünü bul ve CONFIRM_ORDER olarak döndür
            const foundProduct = findProduct(actionData.productTitle);
            if (foundProduct) {
              action = {
                type: 'CONFIRM_ORDER',
                product: foundProduct,
                quantity: actionData.quantity || 1,
                orderNote: actionData.orderNote // Not zaten verilmişse ekle
              };
            }
          } else if (actionData.type === 'ASK_NOTE' && actionData.productTitle) {
            // Not sorma - ürünü bul ve ASK_NOTE olarak döndür
            const foundProduct = findProduct(actionData.productTitle);
            if (foundProduct) {
              action = {
                type: 'ASK_NOTE',
                product: foundProduct,
                quantity: actionData.quantity || 1,
                noteOptions: actionData.noteOptions || []
              };
            }
          } else if (actionData.type === 'ASK_PORTION') {
            const foundProduct = findProduct(actionData.productTitle);
            if (foundProduct) {
              action = {
                type: 'ASK_PORTION',
                product: foundProduct,
                quantity: actionData.quantity || 1
              };
            }
          } else if (actionData.type === 'PRODUCT_NOT_FOUND') {
            action = actionData;
          } else if (actionData.type === 'VIEW_CART') {
            action = { type: 'VIEW_CART' };
          } else if (actionData.type === 'CLEAR_CART') {
            action = { type: 'CLEAR_CART' };
          } else if (actionData.type === 'SUBMIT_ORDER') {
            action = { type: 'SUBMIT_ORDER' };
          } else if (actionData.type === 'MULTI_CONFIRM' && actionData.products) {
            // Çoklu ürün onayı - tüm ürünleri bul
            const products = actionData.products.map((p: any) => {
              const foundProduct = findProduct(p.productTitle);
              if (foundProduct) {
                return {
                  product: foundProduct,
                  quantity: p.quantity || 1,
                  orderNote: p.orderNote
                };
              }
              return null;
            }).filter(Boolean);

            if (products.length > 0) {
              action = {
                type: 'MULTI_CONFIRM',
                products: products
              };
            }
          }
        } catch (parseError) {
          console.error('Action parse error:', parseError);
        }

        // Action tag'ini response'dan kaldır
        aiResponse = aiResponse.replace(/\|\|\|ACTION\|\|\|[\s\S]*?\|\|\|END_ACTION\|\|\|/g, '').trim();
      }

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
        action,
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
