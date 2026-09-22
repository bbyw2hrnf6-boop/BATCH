'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Check, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n, type Language } from '@/lib/i18n';

const choices: { value: Language; code: string; name: string; action: string }[] = [
  { value: 'de', code: 'DE', name: 'Deutsch', action: 'Weiter auf Deutsch' },
  { value: 'en', code: 'EN', name: 'English', action: 'Continue in English' },
  { value: 'nb', code: 'NO', name: 'Norsk bokmål', action: 'Fortsett på norsk' },
];

export default function LanguageWelcome() {
  const { language, languageReady, setLanguage, t } = useI18n();
  // Show on every page opening, including for returning visitors.
  const [open, setOpen] = useState(true);
  const buttons = useRef<Partial<Record<Language, HTMLButtonElement | null>>>({});

  return <Dialog open={languageReady && open} onOpenChange={setOpen}>
    <DialogContent className="language-welcome" showCloseButton={false}
      onOpenAutoFocus={event => { event.preventDefault(); buttons.current[language]?.focus(); }}
      onCloseAutoFocus={event => { event.preventDefault(); document.getElementById('language-switcher')?.focus(); }}>
      <div className="welcome-brand"><span>BATCH<small>AFTER HOURS</small></span><span className="welcome-language-icon"><Languages aria-hidden="true" /></span></div>
      <DialogHeader>
        <DialogTitle>{t('Sprache wählen')}</DialogTitle>
        <DialogDescription><span lang="de">Willkommen</span> · <span lang="en">Welcome</span> · <span lang="nb">Velkommen</span></DialogDescription>
      </DialogHeader>
      <div className="welcome-choices">{choices.map(choice => <Button key={choice.value} ref={node => { buttons.current[choice.value] = node; }} type="button" variant="outline" className={`welcome-choice ${language === choice.value ? 'is-preferred' : ''}`} lang={choice.value} onClick={() => { setLanguage(choice.value); setOpen(false); }}>
        <span className="welcome-code" aria-hidden="true">{choice.code}</span><span className="welcome-choice-copy"><strong>{choice.name}</strong><span>{choice.action}</span></span>{language === choice.value ? <Check className="welcome-choice-icon" aria-hidden="true" /> : <ArrowRight className="welcome-choice-icon" aria-hidden="true" />}
      </Button>)}</div>
      <p className="welcome-help">{t('Du kannst die Sprache jederzeit oben in der App ändern.')}</p>
    </DialogContent>
  </Dialog>;
}
