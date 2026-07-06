# UltraPlan — Nihai Dilek Makinesi

## UltraPlan Nedir

UltraPlan, cc-viewer'in Claude Code'un yerel `/ultraplan` komutunun **yerelleştirilmiş uygulamasıdır**. `/ultraplan`'ın tüm yeteneklerini **Claude'un resmi uzak hizmetini başlatmaya gerek kalmadan** yerel ortamınızda kullanmanızı sağlar ve Claude Code'u **çoklu ajan işbirliği** kullanarak karmaşık planlama ve uygulama görevlerini yerine getirmeye yönlendirir.

Normal Plan modu veya Agent Team ile karşılaştırıldığında, UltraPlan şunları yapabilir:
- Görev karmaşıklığını otomatik olarak değerlendirip optimal planlama stratejisini seçmek
- Kod tabanını farklı boyutlardan keşfetmek için birden fazla paralel ajan dağıtmak
- Sektördeki en iyi uygulamalar için harici araştırma (webSearch) dahil etmek
- Plan yürütmesinden sonra kod incelemesi için otomatik olarak bir Code Review Ekibi oluşturmak
- Tam bir **Planla → Yürüt → İncele → Düzelt** kapalı döngüsü oluşturmak

---

## Önemli Notlar

### 1. UltraPlan Her Şeye Kadir Değildir
UltraPlan daha güçlü bir dilek makinesidir, ancak bu her dileğin gerçekleştirilebileceği anlamına gelmez. Plan ve Agent Team'den daha güçlüdür, ancak doğrudan "size para kazandıramaz". Makul görev ayrıntı düzeyini göz önünde bulundurun — her şeyi tek seferde başarmaya çalışmak yerine büyük hedefleri yürütülebilir orta ölçekli görevlere bölün.

### 2. Şu Anda Programlama Projeleri İçin En Etkili
UltraPlan'ın şablonları ve iş akışları, programlama projeleri için derinlemesine optimize edilmiştir. Diğer senaryolar (dokümantasyon, veri analizi vb.) denenebilir, ancak gelecek sürüm uyarlamalarını beklemek isteyebilirsiniz.

### 3. Yürütme Süresi ve Bağlam Penceresi Gereksinimleri
- Başarılı bir UltraPlan çalıştırması genellikle **30 dakika veya daha fazla** sürer
- MainAgent'in büyük bir bağlam penceresine sahip olmasını gerektirir (1M bağlamlı Opus modeli önerilir)
- Yalnızca 200K modeliniz varsa, **çalıştırmadan önce bağlamı `/clear` ile temizlediğinizden emin olun**
- Claude Code'un `/compact` komutu bağlam penceresi yetersiz olduğunda kötü performans gösterir — alanın tükenmesinden kaçının
- Yeterli bağlam alanını korumak, başarılı UltraPlan yürütmesi için kritik bir ön koşuldur

Yerelleştirilmiş UltraPlan hakkında sorularınız veya önerileriniz varsa, tartışmak ve işbirliği yapmak için [GitHub'da Issues](https://github.com/anthropics/claude-code/issues) açmaktan çekinmeyin.

---

## Nasıl Çalışır

UltraPlan iki çalışma modu sunar:

### Otomatik Mod
Görev karmaşıklığını (puan 4-12) otomatik olarak analiz eder ve farklı stratejilere yönlendirir:

| Rota | Puan | Strateji |
|------|------|----------|
| Rota A | 4-6 | Doğrudan kod keşfi ile hafif planlama |
| Rota B | 7-9 | Yapısal diyagramlarla planlama (Mermaid / ASCII) |
| Rota C | 10-12 | Çoklu ajan keşfi + inceleme kapalı döngüsü |

### Zorunlu Mod
Rota C'nin tam çoklu ajan iş akışını doğrudan etkinleştirir:
1. Kod tabanını eş zamanlı olarak keşfetmek için 5'e kadar paralel ajan dağıtma (mimari, dosya tanımlama, risk değerlendirmesi vb.)
2. İsteğe bağlı olarak webSearch aracılığıyla sektör çözümlerini araştırmak için bir araştırma ajanı dağıtma
3. Tüm ajan bulgularını ayrıntılı bir uygulama planında sentezleme
4. Planı birden fazla perspektiften incelemek için bir inceleme ajanı dağıtma
5. Onaylandıktan sonra planı yürütme
6. Uygulamadan sonra kod kalitesini doğrulamak için otomatik olarak bir Code Review Ekibi oluşturma
