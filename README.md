# FIT — Fitness Intelligent Team

**По-силни днес. По-добри хора утре.**

Android приложение за начинаещи във фитнеса: скенер на уреди, до 10 упражнения на уред според цел, възраст и ограничения, 12-седмична програма (адаптация → натрупване → пробив), няколко цели наведнъж (напр. рекомпозиция + стойка), витамини и минерали преди/по време/след тренировка, предизвикателства за тялото и характера, събития (маратони, Ком–Емине, трейлове, катерене), магазини, новини и връзка с **MAMA — My Amazing Market Area**.

## Инсталиране

Последната версия: https://github.com/ngerchev-code/fit/releases/latest/download/FIT.apk — отвори линка от телефона и инсталирай.

## iPhone

- **Веднага, като уеб приложение.** Отвори https://ngerchev-code.github.io/FIT/ в Safari, натисни „Сподели“ и избери „Добави към началния екран“. За целта първо трябва еднократно да се включи **Settings → Pages → Source: GitHub Actions**.
- **Като приложение.** Проектът е в `ios/` (Capacitor 7, Swift Package Manager), а `.github/workflows/ios.yml` го компилира на macOS. За App Store или TestFlight е нужен Apple Developer акаунт (подпис и сертификат).

## Часовник (Wear OS, напр. Galaxy Watch Ultra)

`FIT-watch.apk` от Releases е придружител на FIT за Android. Има същото applicationId и същия подпис, затова двете приложения се свързват автоматично. Инсталирането става през ADB по Wi-Fi: на часовника се включват опциите за разработчици, после „ADB debugging“ и „Wireless debugging“. За самото инсталиране на телефона може да се ползва Wear Installer 2 или Bugjaeger.

## Състояние и план

Виж `docs/IMPLEMENTATION_STATUS.md` и `CHANGELOG.md`. Заданието е в `docs/CLAUDE_IMPLEMENTATION_BRIEF.md`.

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

## AI разпознаване на уреди (сървър)

Папка `server/` е малък сървър за Netlify, който праща снимката към Claude. Ключът стои само в Netlify.

1. netlify.com → **Add new site → Import an existing project → GitHub → ngerchev-code/FIT**.
2. **Base directory:** `server` → Deploy.
3. **Site configuration → Environment variables → Add:** `ANTHROPIC_API_KEY` = ключът от console.anthropic.com → **Deploy again**.
4. Във FIT: меню → **AI разпознаване** → адрес `https://<името-на-сайта>.netlify.app/api/scan`.
