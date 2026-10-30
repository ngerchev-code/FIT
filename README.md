# FIT — Fitness Intelligent Team

**По-силни днес. По-добри хора утре.**

Android приложение за начинаещи във фитнеса: скенер на уреди, до 10 упражнения на уред според цел, възраст и ограничения, 12-седмична програма (адаптация → натрупване → пробив), няколко цели наведнъж (напр. рекомпозиция + стойка), витамини и минерали преди/по време/след тренировка, предизвикателства за тялото и характера, събития (маратони, Ком–Емине, трейлове, катерене), магазини, новини и връзка с **MAMA — My Amazing Market Area**.

## Инсталиране

Последната версия: https://github.com/ngerchev-code/fit/releases/latest/download/FIT.apk — отвори линка от телефона и инсталирай.

## Как се изгражда

`.github/workflows/android.yml` изгражда подписан APK и AAB при всяка промяна в `www/` или `android/` и ги публикува в **Releases**.

Еднократно: **Settings → Actions → General → Workflow permissions → Read and write permissions → Save.**

## Структура

```
www/            приложението (HTML/CSS/JS)
android/        Android проект (Capacitor 7), иконки, splash, ключ
store/          икона 512×512 за Google Play
```

## Подписване

Ключът е в `android/keystore/fit-release.jks` (парола по подразбиране `fit-release-2026`). Преди публикуване в Google Play смени паролите през GitHub Secrets `FIT_STORE_PASSWORD`, `FIT_KEY_PASSWORD`, `FIT_KEY_ALIAS`.

## Връзка с MAMA

- FIT → MAMA: бутонът „Отвори MAMA“ отваря инсталираното приложение (`bg.ngerchev.mama`), иначе сваля MAMA.apk.
- MAMA → FIT: схема `bg.ngerchev.fit://open` отваря инсталирания FIT.
