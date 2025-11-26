# Canlı Menü - Complete Feature List

## Analyzed from ASP.NET UI (Index.cshtml - 7309 lines)

### ✅ CURRENTLY IMPLEMENTED IN NEXT.JS

1. **Splash Screen**
   - Logo display
   - Background image
   - Liquid morph animation (2s wait + 1.2s animation)
   - Remove from DOM after animation

2. **Basic Layout**
   - Desktop: 412x915px Galaxy S20 Ultra simulation
   - Mobile: Full responsive
   - Background image/gradient

3. **Language Selector**
   - TR/EN toggle
   - Fixed top-right position
   - Active state styling

4. **Category Grid**
   - 2-column grid
   - Category cards with images
   - Cascade animation (staggered delays)
   - Hover effects

5. **Bottom Navigation Bar**
   - Profile button
   - AI Assistant button
   - Cart button
   - Fixed bottom position

---

## ❌ MISSING FEATURES TO IMPLEMENT

### 1. **Header Tabs System** (CRITICAL - Most Complex Feature)
   - **API Integration:** `/api/Advertisements/GetActiveTabs?customerCode=XXX`
   - **5 Tab Types:**
     1. **Image Tab:** Image slider with dots, auto-rotation
     2. **Video Tab:** Video playback (autoplay, loop, muted, playsinline)
     3. **Campaign Tab:** Title, subtitle, CTA button
     4. **FavoriteProducts:** Horizontal scroll of selected products
     5. **BestSellingProducts:** Horizontal scroll of best-selling products
   - **Features:**
     - Pre-render all tabs (visibility: hidden for preload)
     - Slider dots navigation
     - Touch swipe events
     - Auto-rotation (5 seconds)
     - Lazy load product details
     - Cache system
   - **Fallback:** Show customer logo if no tabs

### 2. **Language System** (i18n)
   - **TR/EN Toggle:**
     - localStorage persistence
     - data-tr / data-en attributes
     - Category title translations (TitleEN field)
     - Product translations
     - UI text translations
   - **Functions:**
     - `toggleLanguage()`
     - `applyEnglishTranslations()`
     - `applyTurkishTranslations()`

### 3. **Product List Modal** (Category Click)
   - **openProductListModal(categoryId, categoryTitle)**
   - **Features:**
     - Font loading wait (performance)
     - Smooth animations (fade + slide)
     - Body scroll lock
     - ESC key close
     - Outside click close
     - Category slider inside modal
     - Product grid/list view
     - Product detail modal from list
   - **Functions:**
     - `renderProductsInModal()`
     - `updateModalCategorySlider()`
     - `changeModalCategory()`
     - `openProductModal(productId)`

### 4. **Dynamic Colors & Fonts**
   - **Customer-specific styling:**
     - IndexTextColor (category titles)
     - ProductTitleColor
     - ProductDescriptionColor
     - CategoryFont (Google Fonts)
     - ProductFont (Google Fonts)
   - **Implementation:**
     - Inject `<style>` tags with customer data
     - Preconnect to Google Fonts
     - Font loading with display=block (prevent FOUC)

### 5. **Social Media Links**
   - **Render from Customer data:**
     - Website, Facebook, Instagram, WhatsApp, YouTube, Phone, Maps
   - **Styling:**
     - Circular icons with brand colors
     - Hover animations
     - Located below header area

### 6. **Image Preload System**
   - **Preload:**
     - Background image (fetchpriority="high")
     - Customer logo
     - Category images
     - Header tab images
     - Product images
   - **Hidden preload container** (opacity: 0, pointer-events: none)

### 7. **Global State Management**
   - **window.menuData** - Complete menu JSON
   - **window.basketSystemEnabled** - Cart feature flag
   - **window.customerId** - Customer ID for APIs
   - **window.headerTabDOMCache** - Tab render cache
   - **window.chatManager** - AI Chat manager
   - **window.cartManager** - Cart manager
   - **window.gameManager** - Games manager

### 8. **AI Chat Widget** (from widgets-container)
   - Quick questions
   - Chat messages
   - Expand/collapse
   - Gemini AI integration
   - Full-screen mode on mobile

### 9. **Banner Overlay System**
   - **showBannerIfNeeded()** - After splash screen
   - Click to navigate
   - Close button
   - One-time display logic

### 10. **Games System** (Optional - from sidebar)
   - Game menu button (left side)
   - Sidebar with game list
   - Lobby system
   - SignalR integration

---

## IMPLEMENTATION PRIORITY

### Phase 1: CRITICAL (Must Have)
1. ✅ Header Tabs System (ALL 5 types)
2. ✅ Language System (TR/EN)
3. ✅ Product List Modal
4. ✅ Dynamic Colors & Fonts

### Phase 2: IMPORTANT (Should Have)
5. ⚠️ Social Media Links
6. ⚠️ Image Preload System
7. ⚠️ Global State with Context API

### Phase 3: OPTIONAL (Nice to Have)
8. ❓ AI Chat Widget
9. ❓ Banner Overlay
10. ❓ Games System

---

## TECHNICAL NOTES

### Performance Optimizations (from ASP.NET)
- **Eager loading** for above-the-fold images
- **Visibility: hidden** instead of display: none (preload)
- **Font loading** with display=block
- **Preconnect** for external resources
- **DOM caching** for rendered tabs
- **requestAnimationFrame** for smooth animations

### Mobile-First Approach
- Touch events (swipe for tabs)
- Viewport meta tags
- Safe area insets (iOS)
- -webkit-tap-highlight-color: transparent
- -webkit-overflow-scrolling: touch

### ASP.NET Specifics to Convert
- **@Model** → API fetch
- **@ViewBag.Customer** → Customer data from API
- **@Html.Raw** → dangerouslySetInnerHTML (careful!)
- **onclick="function()"** → React event handlers
- **Razor syntax** → JSX/TSX

---

## FILES TO CREATE/UPDATE

### New Components
1. `components/home/HeaderTabs.tsx` - Main header tabs component
2. `components/home/ImageSlider.tsx` - Image tab slider
3. `components/home/VideoPlayer.tsx` - Video tab player
4. `components/home/CampaignBanner.tsx` - Campaign tab
5. `components/home/ProductSlider.tsx` - Products tab
6. `components/home/SocialMediaLinks.tsx` - Social links
7. `components/modals/ProductListModal.tsx` - Category products modal
8. `components/modals/ProductDetailModal.tsx` - Single product modal

### Contexts
1. `contexts/LanguageContext.tsx` - i18n system
2. `contexts/GlobalContext.tsx` - window.menuData equivalent

### Hooks
1. `hooks/useImagePreload.ts` - Image preloading
2. `hooks/useFontLoader.ts` - Google Fonts loader

### API Routes
1. `app/api/advertisements/[code]/route.ts` - Header tabs API

---

## NEXT STEPS

1. Read `_Layout.cshtml` for Bottom Nav details
2. Implement Header Tabs System (BIGGEST FEATURE)
3. Implement Language System
4. Implement Product Modal System
5. Add Dynamic Colors & Fonts
6. Test with real customer data
