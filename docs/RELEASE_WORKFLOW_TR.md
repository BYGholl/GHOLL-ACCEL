# Release İş Akışı

## 1. Geliştirme

Kodları burada düzenle:

```text
development/chrome/
development/firefox/
```

## 2. Doğrulama

```bash
python scripts/build_release.py --validate-only
```

## 3. Paket üretme

```bash
python scripts/build_release.py
```

## 4. GitHub Release

GitHub'da:

```text
Releases → Create a new release
```

Ayarlar:

```text
Tag: v1.0.0
Title: GHOLL-ACCEL v1.0.0 - First Public Stable Release
```

Asset olarak şunları yükle:

```text
releases/v1.0.0/GHOLL-ACCEL-chromium-v1.0.0.zip
releases/v1.0.0/GHOLL-ACCEL-firefox-v1.0.0.zip
releases/v1.0.0/SHA256SUMS.txt
```

## 5. Store'a yükleme

Chrome Web Store / Brave / Edge için:

```text
GHOLL-ACCEL-chromium-v1.0.0.zip
```

Firefox AMO için:

```text
GHOLL-ACCEL-firefox-v1.0.0.zip
```
