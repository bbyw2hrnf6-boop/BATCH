'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCheck, ClipboardList, Lightbulb, Minus, Plus, RotateCcw, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useI18n } from '@/lib/i18n';
import content from '@/lib/guide-content.json';
import { parseQuantity, splitBottles } from '@/lib/inventory';
import AnimatedNumber from './animated-number';

const icons = [Wine, BookOpen, ClipboardList, CheckCheck];
export default function Guide({ onNavigate }: { onNavigate: (target: string) => void }) {
  const { language, t, format } = useI18n();
  const [step, setStep] = useState(0);
  const [full, setFull] = useState('4');
  const [remainder, setRemainder] = useState('250');
  const selected = content.steps[step];
  const Icon = icons[step];
  const fullN = parseQuantity(full), restN = parseQuantity(remainder);
  const valid = Number.isInteger(fullN) && fullN >= 0 && fullN <= 10000 && Number.isFinite(restN) && restN >= 0 && restN <= 700;
  const total = valid ? fullN * 700 + restN : 0;
  const equivalent = splitBottles(total * 0.75, 700);
  return <div className="guide-page">
    <div className="guide-intro"><span className="guide-label"><BookOpen size={16} />{t('So funktioniert’s')}</span><h2>{t('In vier Schritten zur Inventur')}</h2><p>{t('Ein Pre-Batch ist eine vorab gemischte Cocktailbasis in einer Flasche. BATCH rechnet sie für die Inventur wieder in ihre einzelnen Zutaten um.')}</p></div>
    <div className="guide-layout"><nav className="guide-steps" aria-label={t('Anleitungsschritte')}>{content.steps.map((item, index) => { const StepIcon = icons[index]; return <button key={item.id} className={step === index ? 'selected' : ''} onClick={() => setStep(index)} aria-current={step === index ? 'step' : undefined}><span className="step-icon"><StepIcon size={21} /></span><span className="step-text"><small>{t('Schritt {step} von {total}', { step: index + 1, total: 4 })}</small><strong>{item.title[language]}</strong></span><span className="step-number">0{index + 1}</span></button>; })}</nav>
      <article className="guide-card" key={step}><div className="guide-card-top"><div className="guide-feature-icon"><Icon size={32} /></div><span>0{step + 1}<small> / 04</small></span></div><h3>{selected.title[language]}</h3><p>{selected.body[language]}</p><div className="guide-tip"><Lightbulb size={19} /><p>{selected.tip[language]}</p></div><Button className="primary-button" onClick={() => onNavigate(selected.target)}>{selected.action[language]}<ArrowRight /></Button><div className="guide-pagination"><Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft />{t('Vorheriger Schritt')}</Button><Button variant="ghost" disabled={step === 3} onClick={() => setStep(step + 1)}>{t('Nächster Schritt')}<ArrowRight /></Button></div></article>
    </div>
    <section className="guide-demo"><div className="guide-demo-copy"><p className="eyebrow">{t('Beispielrechnung')}</p><h3>{t('Probier die Rechnung aus.')}</h3><p>{t('Paloma enthält 75 % Chili-Tequila-Infusion. Beispiel: 700-ml-Batchflaschen, 700-ml-Originalflasche und ein bestätigter Infusionsfaktor von 1.')}</p><span className="safe-demo"><span />{t('Nur Anzeige · keine Bestandsänderung')}</span></div><div className="guide-demo-calculator"><div className="guide-demo-inputs"><label className="field"><span>{t('Volle Flaschen')}</span><div className="mini-stepper"><Button variant="ghost" aria-label={t('Eine volle Flasche weniger')} disabled={!valid || fullN === 0} onClick={() => setFull(String(Math.max(0, fullN - 1)))}><Minus /></Button><Input inputMode="numeric" aria-label={t('Volle Flaschen')} value={full} onChange={e => setFull(e.target.value)} /><Button variant="ghost" aria-label={t('Eine volle Flasche mehr')} disabled={!valid || fullN === 10000} onClick={() => setFull(String(fullN + 1))}><Plus /></Button></div></label><label className="field"><span>{t('Restmenge')}</span><span className="quantity-input"><Input inputMode="decimal" value={remainder} aria-label={t('Restmenge in ml')} onChange={e => setRemainder(e.target.value)} /><span>ml</span></span></label></div><div className="guide-demo-total"><span>{t('Pre-Batch gesamt')}</span><strong>{valid ? <AnimatedNumber value={total} /> : '—'} ml</strong></div><div className="guide-demo-result"><Wine size={23} /><div><small>{t('Chili-Tequila-Infusion')} · 75 %</small><p className="muted-help">{valid ? format(total * 0.75 / 10) : '—'} cl {t('im Batch')}</p><strong>{valid ? t('{bottles} Fl. + {rest} cl', { bottles: equivalent.bottles, rest: format(equivalent.remainderCl) }) : t('Bitte die Mengen prüfen.')}</strong></div></div><button className="text-button" onClick={() => { setFull('4'); setRemainder('250'); }}><RotateCcw size={14} />{t('Demo zurücksetzen')}</button></div></section>
    <section className="guide-faq"><h3>{t('Häufige Fragen')}</h3><Accordion type="single" collapsible>{content.faq.map((item, index) => <AccordionItem key={index} value={String(index)}><AccordionTrigger>{item.question[language]}</AccordionTrigger><AccordionContent>{item.answer[language]}</AccordionContent></AccordionItem>)}</Accordion></section>
  </div>;
}
