import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const today = new Date().toISOString().split('T')[0]
function daysFrom(n) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function DevSeed() {
  const { lawyer, session } = useAuth()
  const [log,     setLog]     = useState([])
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  function push(msg, ok = true) {
    setLog(l => [...l, { msg, ok }])
  }

  async function seed() {
    setLoading(true); setLog([]); setDone(false)

    const lid = lawyer?.id ?? session?.user?.id
    if (!lid) { push('Erro: não autenticado', false); setLoading(false); return }

    /* ── 0. Ensure lawyer row exists ────────────────────────────── */
    const { error: le } = await supabase
      .from('lawyers')
      .upsert({ id: lid, firm_name: 'Atlas Adv', onboarding_completed: true }, { onConflict: 'id', ignoreDuplicates: true })
    if (le) { push(`Erro ao garantir perfil: ${le.message}`, false); setLoading(false); return }
    push('✓ Perfil de advogado verificado')

    /* ── 1. Clients ─────────────────────────────────────────────── */
    const { data: clients, error: ce } = await supabase
      .from('clients')
      .insert([
        {
          lawyer_id: lid,
          full_name: 'Ana Clara Rodrigues',
          tipo: 'PF',
          cpf_cnpj: '123.456.789-00',
          email: 'ana@example.com',
          phone: '(11) 99999-0001',
          cidade: 'São Paulo',
          estado: 'SP',
          notes: 'Cliente desde 2024. Caso de família em andamento.',
        },
        {
          lawyer_id: lid,
          full_name: 'Ricardo Mendes',
          tipo: 'PF',
          cpf_cnpj: '987.654.321-00',
          email: 'ricardo@example.com',
          phone: '(21) 99999-0002',
          cidade: 'Rio de Janeiro',
          estado: 'RJ',
          notes: 'Ação trabalhista contra ex-empregador.',
        },
        {
          lawyer_id: lid,
          full_name: 'TechBrasil Ltda',
          tipo: 'PJ',
          cpf_cnpj: '12.345.678/0001-90',
          email: 'contato@techbrasil.com.br',
          phone: '(11) 3000-0003',
          cidade: 'São Paulo',
          estado: 'SP',
          notes: 'Empresa de tecnologia. Consultoria societária.',
        },
      ])
      .select()

    if (ce) { push(`Erro ao criar clientes: ${ce.message}`, false); setLoading(false); return }
    push(`✓ ${clients.length} clientes criados`)

    const [ana, ricardo, techbrasil] = clients

    /* ── 2. Cases ───────────────────────────────────────────────── */
    const { data: cases, error: kce } = await supabase
      .from('cases')
      .insert([
        {
          lawyer_id: lid,
          title: 'Divórcio Litigioso — Ana Clara',
          case_number: '0001234-55.2024.8.26.0100',
          client_id: ana.id,
          court: 'TJSP',
          area: 'Família',
          status: 'ativo',
          valor: 15000,
          opened_at: daysFrom(-90),
          description: 'Divórcio com disputa de guarda e partilha de bens.',
        },
        {
          lawyer_id: lid,
          title: 'Reclamação Trabalhista — Ricardo Mendes',
          case_number: '0005678-99.2025.5.01.0001',
          client_id: ricardo.id,
          court: 'TRT1',
          area: 'Trabalhista',
          status: 'ativo',
          valor: 48000,
          opened_at: daysFrom(-60),
          description: 'Horas extras não pagas e verbas rescisórias.',
        },
        {
          lawyer_id: lid,
          title: 'Revisão Contratual — TechBrasil',
          case_number: '0009876-11.2023.8.26.0100',
          client_id: techbrasil.id,
          court: 'TJSP',
          area: 'Societário',
          status: 'suspenso',
          valor: 25000,
          opened_at: daysFrom(-180),
          description: 'Revisão de contrato social e acordo de sócios.',
        },
        {
          lawyer_id: lid,
          title: 'Indenização por Danos Morais — Ana Clara',
          case_number: '0003210-44.2022.8.26.0100',
          client_id: ana.id,
          court: 'TJSP',
          area: 'Cível',
          status: 'encerrado',
          valor: 8000,
          opened_at: daysFrom(-365),
          final_fees: 8000,
          description: 'Indenização por danos morais. Acordo judicial homologado.',
        },
      ])
      .select()

    if (kce) { push(`Erro ao criar casos: ${kce.message}`, false); setLoading(false); return }
    push(`✓ ${cases.length} casos criados`)

    const [caso1, caso2, caso3, caso4] = cases

    /* ── 3. Tasks ───────────────────────────────────────────────── */
    const { data: tasks, error: te } = await supabase
      .from('tasks')
      .insert([
        {
          lawyer_id: lid,
          title: 'Protocolar petição inicial — prazo improrrogável',
          case_id: caso1.id,
          priority: 'urgente',
          status: 'pendente',
          due_date: daysFrom(-3) + 'T00:00:00',
          description: 'Prazo fatal para protocolo da petição inicial no TJSP.',
        },
        {
          lawyer_id: lid,
          title: 'Audiência de conciliação — TRT1',
          case_id: caso2.id,
          priority: 'alta',
          status: 'em_andamento',
          due_date: today + 'T09:00:00',
          description: 'Audiência de conciliação marcada para hoje às 9h.',
        },
        {
          lawyer_id: lid,
          title: 'Revisar minuta do acordo de sócios',
          case_id: caso3.id,
          priority: 'media',
          status: 'pendente',
          due_date: daysFrom(7) + 'T00:00:00',
          description: 'Revisão da minuta enviada pelo cliente.',
        },
        {
          lawyer_id: lid,
          title: 'Atualizar jurisprudência sobre danos morais',
          case_id: caso4.id,
          priority: 'baixa',
          status: 'pendente',
          due_date: daysFrom(14) + 'T00:00:00',
          description: 'Pesquisa de jurisprudência para fortalecer argumentos.',
        },
        {
          lawyer_id: lid,
          title: 'Notificação de encerramento enviada',
          case_id: caso4.id,
          priority: 'media',
          status: 'concluida',
          due_date: daysFrom(-10) + 'T00:00:00',
          completed_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
          description: 'Notificação de encerramento enviada ao cliente.',
        },
      ])
      .select()

    if (te) { push(`Erro ao criar tarefas: ${te.message}`, false); setLoading(false); return }
    push(`✓ ${tasks.length} tarefas criadas`)

    /* ── 4. Proposals ───────────────────────────────────────────── */
    const { data: proposals, error: pe } = await supabase
      .from('proposals')
      .insert([
        {
          lawyer_id: lid,
          title: 'Proposta — Reclamação Trabalhista Ricardo Mendes',
          client_id: ricardo.id,
          case_id: caso2.id,
          status: 'enviada',
          fee_type: 'percentual_exito',
          fee_percentage: 15,
          valid_until: daysFrom(30),
        },
        {
          lawyer_id: lid,
          title: 'Proposta — Consultoria Societária TechBrasil',
          client_id: techbrasil.id,
          case_id: caso3.id,
          status: 'aceita',
          fee_type: 'fixo',
          fee_amount: 8000,
          valid_until: daysFrom(-30),
        },
      ])
      .select()

    if (pe) { push(`Erro ao criar propostas: ${pe.message}`, false); setLoading(false); return }
    push(`✓ ${proposals.length} propostas criadas`)

    /* ── 5. Financial entries ────────────────────────────────────── */
    const { data: entries, error: fe } = await supabase
      .from('financial_entries')
      .insert([
        {
          lawyer_id: lid,
          description: 'Honorários — Acordo Indenização Ana Clara',
          type: 'receita',
          amount: 8000,
          status: 'pago',
          case_id: caso4.id,
          category: 'Honorários',
          due_date: daysFrom(-20),
          paid_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
        },
        {
          lawyer_id: lid,
          description: 'Adiantamento — Divórcio Ana Clara',
          type: 'receita',
          amount: 5000,
          status: 'pago',
          case_id: caso1.id,
          category: 'Honorários',
          due_date: daysFrom(-45),
          paid_at: new Date(Date.now() - 40 * 24 * 3600000).toISOString(),
        },
        {
          lawyer_id: lid,
          description: 'Custas processuais — TJSP',
          type: 'despesa',
          amount: 750,
          status: 'pago',
          case_id: caso1.id,
          category: 'Custas',
          due_date: daysFrom(-30),
          paid_at: new Date(Date.now() - 28 * 24 * 3600000).toISOString(),
        },
        {
          lawyer_id: lid,
          description: 'Honorários pendentes — TechBrasil',
          type: 'receita',
          amount: 4000,
          status: 'pendente',
          case_id: caso3.id,
          category: 'Honorários',
          due_date: daysFrom(10),
        },
        {
          lawyer_id: lid,
          description: 'Aluguel do escritório — Maio 2026',
          type: 'despesa',
          amount: 2800,
          status: 'pendente',
          category: 'Escritório',
          due_date: daysFrom(5),
        },
      ])
      .select()

    if (fe) { push(`Erro ao criar lançamentos: ${fe.message}`, false); setLoading(false); return }
    push(`✓ ${entries.length} lançamentos financeiros criados`)

    /* ── 6. Notas ──────────────────────────────────────────────── */
    const { data: notas, error: ne } = await supabase
      .from('notas')
      .insert([
        {
          lawyer_id: lid,
          titulo: 'Audiências da semana',
          corpo: 'Segunda: TRT1 às 9h (Ricardo)\nTerça: TJSP às 14h (Ana Clara)\nQuinta: Reunião com TechBrasil',
          cor: 'azul',
          fixada: true,
        },
        {
          lawyer_id: lid,
          titulo: 'Contato urgente — Dr. Lima',
          corpo: 'Retornar ligação sobre o processo de inventário. Tel: (11) 99800-0001',
          cor: 'vermelho',
          fixada: true,
        },
        {
          lawyer_id: lid,
          titulo: 'Pesquisa: jurisprudência STJ danos morais 2025',
          corpo: 'Buscar acórdãos recentes sobre quantum indenizatório em casos de negativação indevida.',
          cor: 'amarelo',
          fixada: false,
        },
        {
          lawyer_id: lid,
          titulo: null,
          corpo: 'Ligar para a assistente da Dra. Fernanda sobre a perícia do caso 3.',
          cor: null,
          fixada: false,
        },
        {
          lawyer_id: lid,
          titulo: 'Renovação OAB',
          corpo: 'Prazo de renovação da anuidade: 31/07/2026. Organizar documentação.',
          cor: 'verde',
          fixada: false,
        },
      ])
      .select()

    if (ne) {
      if (ne.message?.includes('relation "public.notas" does not exist') || ne.code === '42P01') {
        push('⚠ Tabela "notas" não existe — aplique a migration 20240105000000_add_notas.sql no Supabase dashboard', false)
      } else {
        push(`Erro ao criar notas: ${ne.message}`, false)
      }
    } else {
      push(`✓ ${notas.length} notas criadas`)
    }

    push('─────────────────────────────────')
    push('Dados de teste inseridos com sucesso!')
    setDone(true)
    setLoading(false)
  }

  return (
    <div style={{
      maxWidth: 520,
      margin: '3rem auto',
      padding: '2rem',
      background: 'var(--card)',
      border: 'var(--border)',
      borderRadius: 'var(--radius)',
      fontFamily: 'inherit',
    }}>
      <h2 style={{ marginBottom: '0.5rem', color: 'var(--text)', fontSize: '1.1rem', fontWeight: 700 }}>
        Seed de dados de teste
      </h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Insere 3 clientes, 4 casos, 5 tarefas, 2 propostas, 5 lançamentos financeiros e 5 notas para testes.
        Use apenas em ambiente de desenvolvimento.
      </p>

      <button
        onClick={seed}
        disabled={loading || done}
        style={{
          background: done ? 'var(--green)' : 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '0.6rem 1.25rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: loading || done ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
          marginBottom: '1.5rem',
        }}
      >
        {loading ? 'Inserindo...' : done ? 'Concluído!' : 'Inserir dados de teste'}
      </button>

      {log.length > 0 && (
        <div style={{
          background: 'var(--bg)',
          border: 'var(--border)',
          borderRadius: 8,
          padding: '1rem',
          fontSize: '0.8125rem',
          fontFamily: 'monospace',
          lineHeight: 1.8,
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: l.ok ? 'var(--text)' : '#dc2626' }}>{l.msg}</div>
          ))}
        </div>
      )}
    </div>
  )
}
