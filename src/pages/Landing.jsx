import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import styles from './Landing.module.css'

/* ── Scroll-aware navbar ─────────────────────────────────────────────── */
function Navbar({ onLogin }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={styles.navInner}>
        <div className={styles.navBrand}>
          <div className={styles.navLogoMark}>A</div>
          <span className={styles.navWordmark}>Atlas Adv</span>
        </div>
        <nav className={styles.navLinks}>
          <a href="#recursos" className={styles.navLink}>Recursos</a>
          <a href="#comparativo" className={styles.navLink}>Comparativo</a>
          <a href="#precos" className={styles.navLink}>Preços</a>
        </nav>
        <button className={styles.navCta} onClick={onLogin}>
          Entrar com Google
        </button>
      </div>
    </header>
  )
}

/* ── Hero mock dashboard ─────────────────────────────────────────────── */
function DashMock() {
  return (
    <div className={styles.mockFrame}>
      <div className={styles.mockBar}>
        <span className={styles.mockDot} style={{ background: '#ff5f57' }} />
        <span className={styles.mockDot} style={{ background: '#febc2e' }} />
        <span className={styles.mockDot} style={{ background: '#28c840' }} />
      </div>
      <div className={styles.mockBody}>
        <div className={styles.mockSidebar}>
          {[...Array(7)].map((_, i) => (
            <div key={i} className={`${styles.mockNavItem} ${i === 0 ? styles.mockNavActive : ''}`} />
          ))}
        </div>
        <div className={styles.mockContent}>
          <div className={styles.mockKpiRow}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={styles.mockKpi} />
            ))}
          </div>
          <div className={styles.mockGrid}>
            <div className={styles.mockCard} />
            <div className={styles.mockCard} />
          </div>
          <div className={styles.mockTable}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.mockRow} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Feature card ────────────────────────────────────────────────────── */
function Feature({ icon, title, desc }) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{desc}</p>
    </div>
  )
}

/* ── Check / X icons ─────────────────────────────────────────────────── */
const Check = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" style={{ color: '#22a84a', flexShrink: 0 }}>
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
  </svg>
)
const Cross = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" style={{ color: '#d1d5db', flexShrink: 0 }}>
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
)
const Partial = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" style={{ color: '#f59e0b', flexShrink: 0 }}>
    <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
  </svg>
)

/* ── Comparison rows ─────────────────────────────────────────────────── */
const COMPARISON = [
  { feature: 'Gestão de casos jurídicos',      atlas: true,  planilha: false,   generico: 'partial' },
  { feature: 'Controle financeiro integrado',  atlas: true,  planilha: 'partial', generico: 'partial' },
  { feature: 'Propostas comerciais em PDF',    atlas: true,  planilha: false,   generico: false },
  { feature: 'Gestão de equipe / estagiários', atlas: true,  planilha: false,   generico: 'partial' },
  { feature: 'Notas e documentação',           atlas: true,  planilha: 'partial', generico: true },
  { feature: 'Vitrine pública do escritório',  atlas: true,  planilha: false,   generico: false },
  { feature: 'Feito para o direito brasileiro',atlas: true,  planilha: false,   generico: false },
  { feature: 'Privacidade com RLS por usuário',atlas: true,  planilha: false,   generico: false },
  { feature: 'Gratuito para começar',          atlas: true,  planilha: true,    generico: 'partial' },
]

function Cel({ v }) {
  if (v === true) return <Check />
  if (v === 'partial') return <Partial />
  return <Cross />
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function Landing() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && session) navigate('/painel', { replace: true })
  }, [session, loading, navigate])

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/painel' },
    })
  }

  if (loading || session) return null

  return (
    <div className={styles.page}>
      <Navbar onLogin={handleLogin} />

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>Beta gratuito · Acesso imediato</div>
            <h1 className={styles.heroTitle}>
              O sistema jurídico<br />
              <span className={styles.heroAccent}>que cresce com você</span>
            </h1>
            <p className={styles.heroSub}>
              Gestão de casos, clientes, financeiro, equipe e propostas profissionais —
              tudo em uma plataforma feita para advogados brasileiros.
            </p>
            <div className={styles.heroCtas}>
              <button className={styles.ctaPrimary} onClick={handleLogin}>
                <GoogleIcon />
                Entrar com Google — é grátis
              </button>
              <a href="#recursos" className={styles.ctaSecondary}>Ver recursos →</a>
            </div>
            <p className={styles.heroNote}>Sem cartão de crédito · Setup em menos de 2 minutos</p>
          </div>
          <div className={styles.heroVisual}>
            <DashMock />
          </div>
        </div>

        {/* gradient blobs */}
        <div className={styles.blob1} />
        <div className={styles.blob2} />
      </section>

      {/* ── Feature strip ── */}
      <div className={styles.strip}>
        {['Casos & processos', 'Clientes', 'Financeiro', 'Propostas em PDF', 'Equipe', 'Vitrine pública'].map(f => (
          <span key={f} className={styles.stripItem}>
            <span className={styles.stripDot} />
            {f}
          </span>
        ))}
      </div>

      {/* ── Features ── */}
      <section id="recursos" className={styles.features}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEye}>Recursos</p>
          <h2 className={styles.sectionTitle}>Tudo que seu escritório precisa, em um só lugar</h2>
          <p className={styles.sectionSub}>Sem planilhas. Sem gambiarras. Desenvolvido especificamente para a advocacia brasileira.</p>

          <div className={styles.featureGrid}>
            <Feature
              icon={<BriefcaseIcon />}
              title="Gestão de Casos"
              desc="Acompanhe processos com status, área do direito, tribunal, datas e documentos. Tudo vinculado ao cliente."
            />
            <Feature
              icon={<UsersIcon />}
              title="Clientes & Histórico"
              desc="Perfil completo com contatos, CPF/CNPJ, casos vinculados e timeline de atividades."
            />
            <Feature
              icon={<MoneyIcon />}
              title="Financeiro Integrado"
              desc="Receitas, despesas, honorários e inadimplência. Relatórios em tempo real sem planilha nenhuma."
            />
            <Feature
              icon={<DocIcon />}
              title="Propostas Profissionais"
              desc="Gere propostas comerciais em PDF com layout personalizado, tabelas de honorários e assinatura digital."
            />
            <Feature
              icon={<TeamIcon />}
              title="Gestão de Equipe"
              desc="Distribua tarefas entre estagiários e sócios, acompanhe progresso e defina responsáveis por caso."
            />
            <Feature
              icon={<GlobeIcon />}
              title="Vitrine do Escritório"
              desc="Página pública do seu escritório com áreas de atuação, equipe e formulário de contato."
            />
          </div>
        </div>
      </section>

      {/* ── Differentiators ── */}
      <section className={styles.diff}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEye}>Por que Atlas Adv?</p>
          <h2 className={styles.sectionTitle}>Quatro razões que fazem a diferença</h2>

          <div className={styles.diffGrid}>

            <div className={styles.diffCard}>
              <div className={styles.diffNum}>01</div>
              <h3 className={styles.diffTitle}>Abriu, entendeu.</h3>
              <p className={styles.diffSub}>Pronto em 2 minutos, não em 2 semanas.</p>
              <p className={styles.diffBody}>
                Não existe botão de dúvida no Atlas Adv. A interface fala por si —
                você foca no direito, não em aprender software.
              </p>
            </div>

            <div className={styles.diffCard}>
              <div className={styles.diffNum}>02</div>
              <h3 className={styles.diffTitle}>Feito para advogados. Não para engenheiros.</h3>
              <p className={styles.diffBody}>
                Chega de menus com 40 opções. De relatórios que ninguém lê.
                De integrações que ninguém configurou.
                Só o que você usa, todo dia.
              </p>
            </div>

            <div className={styles.diffCard}>
              <div className={styles.diffNum}>03</div>
              <h3 className={styles.diffTitle}>Sua marca. Sua cor. Sua identidade.</h3>
              <p className={styles.diffBody}>
                Logo, cor de marca, nome do escritório em cada proposta e cada tela.
                Atlas Adv fica nos bastidores. Você fica na frente.
              </p>
            </div>

            <div className={`${styles.diffCard} ${styles.diffCardWide}`}>
              <div className={styles.diffNum}>04</div>
              <div className={styles.diffPriceHeader}>
                <div>
                  <h3 className={styles.diffTitle}>Metade do preço. O dobro de foco.</h3>
                  <p className={styles.diffBody}>
                    Por que pagar R$2.000/ano por funcionalidades que você nunca abre?
                  </p>
                </div>
              </div>
              <table className={styles.priceTable}>
                <thead>
                  <tr>
                    <th className={styles.ptHead}>Sistema</th>
                    <th className={styles.ptHead}>Mensalidade</th>
                    <th className={styles.ptHead}>Por ano</th>
                    <th className={styles.ptHead}>Economia</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Advbox',    mes: 'R$199', ano: 'R$2.388', eco: 'R$1.224/ano' },
                    { name: 'Projuris',  mes: 'R$249', ano: 'R$2.988', eco: 'R$1.824/ano' },
                    { name: 'Astrea',    mes: 'R$169', ano: 'R$2.028', eco: 'R$864/ano'   },
                  ].map(r => (
                    <tr key={r.name} className={styles.ptRow}>
                      <td className={styles.ptCell}>{r.name}</td>
                      <td className={styles.ptCell}>{r.mes}/mês</td>
                      <td className={styles.ptCell}>{r.ano}</td>
                      <td className={`${styles.ptCell} ${styles.ptEco}`}>você economiza {r.eco}</td>
                    </tr>
                  ))}
                  <tr className={styles.ptRowAtlas}>
                    <td className={styles.ptCellAtlas}>Atlas Adv Pro</td>
                    <td className={styles.ptCellAtlas}>R$97/mês</td>
                    <td className={styles.ptCellAtlas}>R$1.164/ano</td>
                    <td className={styles.ptCellAtlas}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className={styles.statsStrip}>
        {[
          { value: '50+',   label: 'escritórios em beta' },
          { value: '1.200+',label: 'casos gerenciados'   },
          { value: '4.9/5', label: 'avaliação média'      },
          { value: '2 min', label: 'para começar'         },
        ].map(s => (
          <div key={s.label} className={styles.statItem}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── How it works ── */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEye}>Como funciona</p>
          <h2 className={styles.sectionTitle}>Comece em menos de 2 minutos</h2>

          <div className={styles.stepsRow}>
            {[
              { n: '01', title: 'Crie sua conta', desc: 'Login com Google. Sem formulários longos, sem espera de aprovação.' },
              { n: '02', title: 'Configure seu escritório', desc: 'Adicione nome, OAB, logo e cor de marca. Personalize em segundos.' },
              { n: '03', title: 'Comece a gerenciar', desc: 'Cadastre clientes, abra casos e controle o financeiro desde o primeiro dia.' },
            ].map(s => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className={styles.testimonials}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEye}>Depoimentos</p>
          <h2 className={styles.sectionTitle}>O que dizem os primeiros usuários</h2>

          <div className={styles.testimonialsGrid}>
            {[
              {
                quote: 'Finalmente um sistema feito para advogado de verdade. Em uma semana já organizei todos os meus processos e clientes. O financeiro integrado salvou meu escritório.',
                name: 'Dr. Roberto Almeida',
                role: 'Advogado Criminalista',
                city: 'São Paulo, SP',
                init: 'RA',
              },
              {
                quote: 'As propostas em PDF impressionam os clientes. Antes eu usava Word e levava horas. Agora em minutos tenho um documento profissional com minha marca.',
                name: 'Dra. Mariana Costa',
                role: 'Direito de Família',
                city: 'Belo Horizonte, MG',
                init: 'MC',
              },
              {
                quote: 'O controle de estagiários e a gestão de tarefas mudaram como meu escritório opera. Cada processo tem responsável e prazo. Nada cai mais no esquecimento.',
                name: 'Dr. Thiago Santos',
                role: 'Direito Trabalhista',
                city: 'Rio de Janeiro, RJ',
                init: 'TS',
              },
            ].map(t => (
              <div key={t.name} className={styles.testimonialCard}>
                <div className={styles.testimonialStars}>{'★'.repeat(5)}</div>
                <p className={styles.testimonialQuote}>"{t.quote}"</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{t.init}</div>
                  <div>
                    <div className={styles.testimonialName}>{t.name}</div>
                    <div className={styles.testimonialRole}>{t.role} · {t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="comparativo" className={styles.comparison}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEye}>Comparativo</p>
          <h2 className={styles.sectionTitle}>Por que Atlas Adv?</h2>
          <p className={styles.sectionSub}>Compare com as alternativas que os escritórios usam hoje.</p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thFeature}>Recurso</th>
                  <th className={styles.thAtlas}>
                    <div className={styles.atlasHeader}>
                      <span className={styles.atlasHeaderMark}>A</span>
                      Atlas Adv
                    </div>
                  </th>
                  <th>Planilhas</th>
                  <th>Sistemas genéricos</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(r => (
                  <tr key={r.feature} className={styles.tr}>
                    <td className={styles.tdFeature}>{r.feature}</td>
                    <td className={`${styles.td} ${styles.tdAtlas}`}><Cel v={r.atlas} /></td>
                    <td className={styles.td}><Cel v={r.planilha} /></td>
                    <td className={styles.td}><Cel v={r.generico} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precos" className={styles.pricing}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEye}>Preços</p>
          <h2 className={styles.sectionTitle}>Simples e transparente</h2>
          <p className={styles.sectionSub}>Comece de graça. Cresça quando precisar.</p>

          <div className={styles.plansRow}>
            <div className={styles.planCard}>
              <div className={styles.planName}>Beta Gratuito</div>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>R$0</span>
                <span className={styles.planPer}>/mês</span>
              </div>
              <p className={styles.planDesc}>Acesso completo durante o período beta. Sem limitações.</p>
              <ul className={styles.planFeats}>
                {['Casos ilimitados', 'Clientes ilimitados', 'Propostas em PDF', 'Equipe até 5 membros', 'Suporte por e-mail'].map(f => (
                  <li key={f} className={styles.planFeat}><Check />{f}</li>
                ))}
              </ul>
              <button className={styles.planCta} onClick={handleLogin}>
                Começar agora — é grátis
              </button>
            </div>

            <div className={`${styles.planCard} ${styles.planCardPro}`}>
              <div className={styles.planBadge}>Em breve</div>
              <div className={styles.planName}>Pro</div>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>R$97</span>
                <span className={styles.planPer}>/mês</span>
              </div>
              <p className={styles.planDesc}>Para escritórios em crescimento que precisam de mais poder.</p>
              <ul className={styles.planFeats}>
                {['Tudo do Beta', 'Equipe ilimitada', 'Relatórios avançados', 'Integração com WhatsApp', 'Suporte prioritário'].map(f => (
                  <li key={f} className={styles.planFeat}><Check />{f}</li>
                ))}
              </ul>
              <button className={styles.planCtaDisabled} disabled>
                Em breve
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section className={styles.security}>
        <div className={styles.sectionInner}>
          <h2 className={styles.securityTitle}>Seus dados protegidos. Sempre.</h2>
          <div className={styles.securityGrid}>
            <div className={styles.secCard}>
              <ShieldIcon />
              <h3>Isolamento total por escritório</h3>
              <p>Row Level Security garante que nenhum dado vaze entre contas. Cada escritório acessa apenas o próprio.</p>
            </div>
            <div className={styles.secCard}>
              <LockIcon />
              <h3>Infraestrutura de nível enterprise</h3>
              <p>Hospedado na Supabase com PostgreSQL, backups automáticos e criptografia em trânsito e em repouso.</p>
            </div>
            <div className={styles.secCard}>
              <GdprIcon />
              <h3>Conforme com a LGPD</h3>
              <p>Desenvolvido com privacidade em mente. Você controla seus dados e pode exportar ou excluir a qualquer momento.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <h2 className={styles.finalCtaTitle}>Pronto para modernizar seu escritório?</h2>
          <p className={styles.finalCtaSub}>Acesso gratuito durante o beta. Comece hoje.</p>
          <button className={styles.ctaPrimary} onClick={handleLogin}>
            <GoogleIcon />
            Entrar com Google — é grátis
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.navLogoMark}>A</div>
            <div>
              <div className={styles.footerName}>Atlas Adv</div>
              <div className={styles.footerSub}>Gestão jurídica inteligente</div>
            </div>
          </div>
          <div className={styles.footerCopy}>
            © {new Date().getFullYear()} Atlas Adv. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ── Inline SVG icons ────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function BriefcaseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
}

function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
}

function MoneyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
}

function DocIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
}

function TeamIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
}

function GlobeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
}

function GdprIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
}
