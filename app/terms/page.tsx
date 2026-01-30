import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms of Use | Glitch Hunter Library',
  description: 'Terms of Use for Glitch Hunter Library.',
  alternates: {
    canonical: '/terms',
  },
};

const TERMS_SECTIONS = [
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
];

export default function TermsPage() {
  return (
    <div className="page">
      <Header actionText="Submit" actionHref="/submit" />
      <main className="page-main">
        <article className="terms-content">
          <h1 className="terms-title">Glitch Hunter Library - Terms of Use</h1>
          <p className="terms-updated">Last updated: 2025-12-12</p>

          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="terms-section">
              <h2>{section.title}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <Footer />
    </div>
  );
}
