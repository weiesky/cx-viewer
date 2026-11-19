# MainAgent

## Tanım

MainAgent, Codex'un agent team durumunda olmadığı zamanlardaki ana istek zinciridir. Kullanıcının Codex ile her etkileşimi bir dizi API isteği üretir ve bunlar arasında MainAgent istekleri çekirdek konuşma zincirini oluşturur — tam system prompt, araç tanımları ve mesaj geçmişi taşırlar.

## Tanımlama Yöntemi

cc-viewer'da MainAgent, `req.mainAgent === true` ile tanımlanır ve `interceptor.js` tarafından istek yakalama sırasında otomatik olarak işaretlenir.

Belirleme koşulları (tümü karşılanmalı):
- İstek gövdesi `system` alanı içerir (system prompt)
- İstek gövdesi `tools` dizisi içerir (araç tanımları)
- system prompt "Codex" karakteristik metni içerir

## SubAgent ile Farkları

| Özellik | MainAgent | SubAgent |
|---------|-----------|----------|
| system prompt | Tam Codex ana prompt'u | Göreve özel kısaltılmış prompt |
| tools dizisi | Tüm kullanılabilir araçları içerir | Genellikle yalnızca görev için gereken az sayıda araç |
| Mesaj geçmişi | Tam konuşma bağlamını biriktirir | Yalnızca alt görevle ilgili mesajlar |
