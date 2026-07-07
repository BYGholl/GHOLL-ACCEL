# GHOLL-ACCEL Chromium Paketi

Sürüm: **v1.0.0 Stable**

Bu klasör GHOLL-ACCEL projesinin Chromium geliştirme kaynağıdır.

## Geliştirme kurulumu

`chrome://extensions` veya `brave://extensions` aç, Developer mode aktif et, sonra **Load unpacked** ile bu klasörü seç.

## Release paketi

Bu klasörü elle ZIP yapma. Repo ana dizininden şunu çalıştır:

```bash
python scripts/build_release.py
```

Hazır paket burada oluşur:

```text
releases/v1.0.0/GHOLL-ACCEL-chromium-v1.0.0.zip
```

BY_Gholl tarafından geliştirildi. MIT lisanslıdır.
