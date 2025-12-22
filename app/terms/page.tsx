import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms of Use',
  description: 'Terms of Use for Glitch Hunter Library.',
  alternates: {
    canonical: '/terms',
  },
};

interface TermsPageProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function TermsPage({ searchParams }: TermsPageProps) {
  const { lang } = await searchParams;
  const envLang = (process.env.NEXT_PUBLIC_LANG || '').toLowerCase();
  const normalizedLang = typeof lang === 'string' ? lang.toLowerCase() : '';
  const resolvedLang =
    normalizedLang === 'en' || normalizedLang === 'ja'
      ? normalizedLang
      : envLang === 'en' || envLang === 'ja'
      ? envLang
      : 'ja';
  const isEnglish = resolvedLang === 'en';
  const shouldIncludeLang = Boolean(normalizedLang || envLang);
  const submitHref = shouldIncludeLang ? `/submit?lang=${resolvedLang}` : '/submit';

  const copy = isEnglish
    ? {
        title: 'Glitch Hunter Library - Terms of Use',
        headerAction: 'Submit',
        updated: 'Last updated: 2025-12-12',
        sections: [
          {
            title: '1. Acceptance of Terms',
            body: [
              'By accessing or using Glitch Hunter Library (the "Service"), you agree to these Terms of Use. If you do not agree, please do not use the Service.',
            ],
          },
          {
            title: '2. Description of Service',
            body: [
              'Glitch Hunter Library is a small experimental web application on the Base network that allows users to submit and view game glitch content. The Service is provided "as is" for informational and entertainment purposes only.',
            ],
          },
          {
            title: '3. Eligibility',
            body: [
              'You are responsible for complying with all laws and regulations applicable to you. You must not use the Service if you are prohibited from doing so under applicable law.',
            ],
          },
          {
            title: '4. User Content',
            body: [
              'You are solely responsible for the content you submit, including any text, images, and links. By submitting content, you represent that you have the rights to share it and that it does not infringe any third-party rights, violate any laws, or contain abusive, hateful, or illegal material.',
              'We may remove or hide content at our discretion.',
            ],
          },
          {
            title: '5. Onchain Activity',
            body: [
              'Some actions may create transactions on public blockchains (such as Base). These transactions are public, irreversible, and may incur network fees. You are solely responsible for any onchain activity and associated costs.',
            ],
          },
          {
            title: '6. No Warranty',
            body: [
              'The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. We do not guarantee that the Service will be error-free, secure, or available at all times.',
            ],
          },
          {
            title: '7. Limitation of Liability',
            body: [
              'To the fullest extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages, or for any loss of data, assets, or profits arising from your use of the Service.',
            ],
          },
          {
            title: '8. Changes to the Service and Terms',
            body: [
              'We may modify or discontinue the Service, and we may update these Terms from time to time. Continued use of the Service after changes become effective constitutes your acceptance of the revised Terms.',
            ],
          },
          {
            title: '9. Contact',
            body: [
              'If you have questions about these Terms, please contact us via our GitHub repository.',
            ],
          },
        ],
      }
    : {
        title: 'Glitch Hunter Library - 利用規約',
        headerAction: '投稿する',
        updated: '最終更新日: 2025-12-12',
        sections: [
          {
            title: '1. 規約への同意',
            body: [
              'Glitch Hunter Library（以下「本サービス」）を利用することで、本規約に同意したものとみなします。同意いただけない場合は利用をお控えください。',
            ],
          },
          {
            title: '2. サービスの説明',
            body: [
              '本サービスは、Baseネットワーク上でゲームのグリッチ投稿・閲覧を行う小規模な実験的アプリです。情報提供および娯楽目的で提供されます。',
            ],
          },
          {
            title: '3. 利用資格',
            body: [
              '利用者は、適用される法令・規則を遵守する責任を負います。法令により利用が禁止される場合は本サービスを利用しないでください。',
            ],
          },
          {
            title: '4. ユーザーコンテンツ',
            body: [
              '投稿される内容（テキスト、画像、リンク等）については利用者が責任を負います。第三者の権利侵害、違法行為、差別的・攻撃的な内容の投稿は禁止します。',
              '当社は必要に応じて内容を削除または非表示にする場合があります。',
            ],
          },
          {
            title: '5. オンチェーン活動',
            body: [
              '一部の操作はBaseなどのブロックチェーン上での取引を伴います。取引は公開かつ不可逆であり、ネットワーク手数料が発生する場合があります。',
            ],
          },
          {
            title: '6. 免責',
            body: [
              '本サービスは現状有姿で提供され、明示黙示を問わず一切の保証は行いません。エラーの不存在、安全性、継続的な提供を保証しません。',
            ],
          },
          {
            title: '7. 責任制限',
            body: [
              '本サービスの利用に起因して生じたいかなる間接損害、特別損害、逸失利益、データ損失についても、当社は責任を負いません。',
            ],
          },
          {
            title: '8. 規約・サービスの変更',
            body: [
              '当社は本サービスの内容を変更・停止することがあります。また、本規約を改定する場合があり、改定後の利用は改定内容への同意とみなされます。',
            ],
          },
          {
            title: '9. 連絡先',
            body: [
              '本規約に関するお問い合わせはGitHubリポジトリ経由でお願いします。',
            ],
          },
        ],
      };

  return (
    <div className="page">
      <Header actionText={copy.headerAction} actionHref={submitHref} />
      <main className="page-main">
        <article className="terms-content">
          <h1 className="terms-title">{copy.title}</h1>
          <p className="terms-updated">{copy.updated}</p>

          {copy.sections.map((section) => (
            <section key={section.title} className="terms-section">
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <Footer />
    </div>
  );
}
