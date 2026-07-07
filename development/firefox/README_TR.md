# GHOLL-ACCEL Firefox Paketi

Sürüm: **v1.0.0 Stable**

Bu klasör GHOLL-ACCEL projesinin Firefox geliştirme kaynağıdır.

## Geliştirme kurulumu

`about:debugging#/runtime/this-firefox` aç, **Load Temporary Add-on** seç, sonra bu klasördeki `manifest.json` dosyasını seç.

## Release paketi

Bu klasörü elle ZIP yapma. Repo ana dizininden şunu çalıştır:

```bash
python scripts/build_release.py
```

Hazır paket burada oluşur:

```text
releases/v1.0.0/GHOLL-ACCEL-firefox-v1.0.0.zip
```

BY_Gholl tarafından geliştirildi. MIT lisanslıdır.
