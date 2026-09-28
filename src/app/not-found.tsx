import s from './status-page.module.css';

export default function NotFound() {
  return (
    <main className={s.page}>
      <p className={s.code}>404</p>
      <h1 className={s.title}>Página não encontrada</h1>
      <p className={s.text}>O endereço pode estar incompleto ou a página deixou de existir.</p>
    </main>
  );
}
