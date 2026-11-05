# Applying for AdSense — free, staying on `github.io`

**No domain. No DNS. No purchase. No fee. R$0.**

We are keeping the site at **`https://apexballvalueswiki.github.io`**.
Applying to Google AdSense is free — Google pays *you*, it never charges you
to sign up or to review your site. There is nothing to buy. Bank/payout details
are only asked for **inside your own Google account, after you start earning**;
they are not a fee and are not needed to apply.

> **One honest caveat:** because `github.io` is a free address owned by GitHub,
> Google may reject the application with a message about not owning the
> domain. That is **also free**. If it happens, nothing is lost: fix the issue
> (or reapply) at no cost. There is no fee for rejection or for trying again.

---

## ✅ What is already done (by me, free — nothing for you to configure)

- **Site verification:** `<meta name="google-adsense-account"
  content="ca-pub-2832011907708910">` is in `index.html` and every built page.
  `ads.txt` is correct. This tag loads nothing and serves no ads.
- **Real content for crawlers:** every one of the **765 HTML pages** now
  includes a complete, readable text version of the page (headings, real
  descriptions, links). Previously a checker that did not run JavaScript saw
  an empty `<div id="root"></div>`. With JavaScript the normal interactive
  site appears instantly — no flash.
- **About and Contact pages** at `/about` and `/contact`, with the operator's
  real published name, private contact email and 15-day response time. They
  are in the footer, the sitemap and the consent banner.
- **Full legal pages** readable without JavaScript, naming the real ad partner
  (Google AdSense, `pub-2832011907708910`), the free Google CMP, the
  non-personalised-ads default and the child-safety wording.
- **Google-certified CMP wiring, fail-closed:** `src/utils/cmp.js` reads
  Google's free *Privacy & messaging* Funding Choices consent API and IAB TCF
  v2. **If no CMP is present, or consent is refused or unknown, ads cannot
  load at all** — even if someone flips the switch. It also applies Google's
  official `pauseAdRequests` and `requestNonPersonalizedAds=1` signals, so
  non-personalised ads are the default for this mixed-age audience.
- **Ad unit IDs are configurable** via `VITE_ADS_SLOT_HOME` and
  `VITE_ADS_SLOT_CALCULATOR`; the one ID you already have works with no edits.
- **Ads are OFF** on both realms, and the Test Realm can never show ads.
- No custom domain, no CNAME, no DNS, no paid CMP, no paid service of any kind.

---

## What only a person can do (all free)

### 1. You create the account (if you're 18+) — 5 minutes
Google requires the AdSense account holder to be **18 or older**. **If that's
you, you can apply in your own name and the payments go to you — no parent or
guardian needed.** If the operator is under 18, a parent/guardian must own the
account instead. A Gmail address is free.

Go to **google.com/adsense** → **Get started** → enter:
`https://apexballvalueswiki.github.io` → fill in the contact details.
Google may mail a PIN to confirm the address — that's free too.

> **Two things to protect yourself:**
> - Use your **real date of birth** on the Google account. Google verifies
>   identity and address with a mailed PIN and payment checks; a mismatch can
>   permanently disable the account and forfeit earnings. I won't help set or
>   adjust an age to get past a check — that's a hard no, for anyone.
> - **Never paste bank details, passwords or PINs anywhere — not to me, not in
>   a chat, not in the code.** I never need them and I'll never ask for them.

### 2. ✅ DONE — verification tag installed
No action. It is on **all 765 HTML pages** plus `404.html`.

> **Do NOT paste the ad-unit code** (the `<ins class="adsbygoogle">` block and
> `(adsbygoogle = window.adsbygoogle || []).push({})`) into `index.html`. That
> code renders an actual advert. This app already creates ad units in
> `src/components/AdSlot.jsx` and injects the `adsbygoogle.js` script in
> `src/utils/ads.js`, **only** after approval + certified-CMP consent + the
> `VITE_ADS_ENABLED` gate. Pasting it into the HTML would show ads before
> consent and bring back the old `TagError` bug.
>
> Your `data-ad-slot="2911497117"` unit is already registered; the app renders
> exactly one slot per page, so it is not duplicated. If you create more ad
> units later, send me the IDs (or set the two variables above).

If AdSense still reports "code missing or incomplete", tell me — Google
sometimes asks for the `<script>` snippet instead, and I'll add it in a gated
way that still respects consent.

### 3. Publish Google's free consent banner — 3 clicks
Inside AdSense: **Privacy & messaging** → **European regulations** →
**Create message** → publish. This is Google's own **certified CMP and it is
free**. You do **not** need a paid third-party cookie tool. If Google gives you
a script URL, send it to me and I'll set `VITE_ADS_CMP_URL`; if Google injects
its CMP automatically, the adapter detects it with no changes.

### 4. Push the ZIP so the changes go live — then click verify
`push.cmd` in the package. Until you push, none of the above is on the live
site. I cannot do this for you. Free.

### 5. Tell me when the account is approved
Then I do, at no cost: set `VITE_ADS_ENABLED=true` on production only,
confirm the CMP signal is being read, and re-run the full verification.

---

## What is left that I cannot do for free (or at all)

- **Google's own account steps** — real DOB, postal PIN, tax form, payment
  details, accepting the contract, clicking submit. Only you, in your browser.
- **A push/deploy** — only you can run `push.cmd`.
- **Account-level child-directed content setting** — set this in AdSense if
  Google asks; the code already defaults to non-personalised ads.
- **A legal professional's review** — the pages are careful technical
  preparation, not legal advice. An independent adult/qualified reviewer
  should still check them. That is a judgement call, not a fee we must pay
  Google.
- **A custom domain** — explicitly off the table. No purchase, ever.

---

## If Google rejects the `github.io` URL

Still free. Options, in order of effort:

1. **Fix what the message says and reapply** — most rejections are about thin
   content or missing pages, not the address itself. The crawlable content and
   About/Contact pages were added specifically to address this.
2. **Reapply later** after the site has more original content.
3. Move the site to a free Google-approved platform (e.g. Blogger) — that is a
   bigger rebuild and I would need to check whether this React app can run
   there. Buying a domain is **not** on the table.

---

## Em português (para você, ou para o responsável se tiver menos de 18)

**Custo: R$0.** Não vamos comprar domínio nem mexer em DNS. O site continua em
`https://apexballvalueswiki.github.io`. O Google não cobra nada para criar a
conta AdSense nem para analisar o site — é o Google que paga o publisher.
Dados bancários só são pedidos **dentro da própria conta Google, depois que
começar a render**; não são uma taxa e não são necessários para se inscrever.

Se você tem **18 anos ou mais**, pode criar a conta em seu próprio nome e
receber os pagamentos, sem precisar de pai/mãe ou responsável. Se tiver menos
de 18, a conta precisa estar em nome de um responsável.

**✅ Já fiz de graça (você não precisa configurar nada):**

- Tag de verificação `<meta name="google-adsense-account"
  content="ca-pub-2832011907708910">` em todas as **765 páginas** + `ads.txt`.
- Texto real e legível em todas as páginas para quem não executa JavaScript
  (antes era uma página vazia), sem alterar a experiência de quem usa o site.
- Páginas **About** (`/about`) e **Contact** (`/contact`) com nome, e-mail e
  prazo de resposta de 15 dias, no rodapé, no sitemap e no banner de
  privacidade.
- Políticas legais completas nomeando o Google AdSense, o CMP gratuito do
  Google e a proteção de crianças/adolescentes.
- Adaptador do **CMP certificado e gratuito** do Google, que **bloqueia os
  anúncios por padrão** se não houver consentimento válido e usa anúncios
  **não personalizados** como padrão.
- IDs dos anúncios configuráveis por variável; o seu ID atual já funciona.

**O que fazer:**

1. Criar a conta em **google.com/adsense** com a conta Google do titular,
   cadastrando o site `https://apexballvalueswiki.github.io`.
2. ✅ **Já feito:** a tag de verificação está instalada. **Não cole** o código
   `<ins class="adsbygoogle">` nem o `push({})`: o aplicativo já cria os
   anúncios somente após aprovação e consentimento.
3. No painel AdSense, publicar o banner gratuito em **Privacy & messaging →
   European regulations → Create message**. É o próprio CMP certificado do
   Google, sem custo.
4. Executar **`push.cmd`** para publicar as alterações e clicar em verificar.
5. Avisar quando a conta for aprovada — eu faço o resto da programação.

**Duas proteções importantes:** use a **data de nascimento real** na conta
Google (o Google confere identidade e endereço por PIN enviado pelo correio e
pelos dados de pagamento; divergência pode bloquear a conta e perder os
rendimentos). E **nunca compartilhe dados bancários, senhas ou PINs com
ninguém** — inclusive comigo; eu nunca preciso deles.

Se o Google recusar por causa do endereço `github.io`, **não há custo**: é
possível corrigir e reaplicar gratuitamente. Não compraremos domínio. Os
anúncios permanecem **desligados** até a aprovação.
