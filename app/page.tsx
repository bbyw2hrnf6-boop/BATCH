import InventoryApp from './inventory-app';
import LanguageWelcome from './language-welcome';
import { I18nProvider } from '@/lib/i18n';
export default function Home() { return <I18nProvider><InventoryApp /><LanguageWelcome /></I18nProvider>; }
