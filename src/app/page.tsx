"use client"

import { useState, useEffect } from 'react'
import { 
  Sprout, Users, TrendingUp, DollarSign, Plus, Edit, Trash2, 
  BarChart3, PieChart, Settings, Download, Upload, AlertTriangle,
  Search, Filter, Calendar, Palette, RotateCcw, FileText, CalendarDays,
  Printer, FileDown, Scissors, Droplets, TreePine, CheckCircle, Circle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'

// Tipos de dados
interface ProductionStage {
  id: string
  name: string
  description: string
  icon: any
  color: string
  duration: number // dias estimados
}

interface ProductionCycle {
  id: string
  cropType: string
  variety: string
  area: number // hectares
  startDate: string
  currentStage: string
  stages: {
    [key: string]: {
      startDate?: string
      endDate?: string
      status: 'pending' | 'in_progress' | 'completed'
      notes: string
      cost: number
      yield?: number // kg para colheita
    }
  }
  totalCost: number
  expectedYield: number
  actualYield: number
  createdAt: string
}

interface Partner {
  id: string
  name: string
  type: 'cliente' | 'fornecedor' | 'trabalhador' | 'tecnico' | 'financiado'
  contact: string
  email: string
  address: string
  specialization?: string
  notes: string
  createdAt: string
}

interface Transaction {
  id: string
  type: 'compra' | 'venda' | 'custo_producao' | 'financiamento' | 'recolha'
  productionCycleId?: string
  partnerId: string
  amount: number
  quantity?: number
  coffeeType?: 'comercial' | 'coco' // Nova propriedade para tipo de café
  description: string
  date: string
  status: 'pendente' | 'concluido' | 'cancelado'
  notes: string
}

interface ReportData {
  period: string
  producao: { ciclos: number; area: number; custo: number; rendimento: number }
  vendas: { quantidade: number; valor: number; count: number }
  custos: { valor: number; count: number }
  lucro: number
  margem: number
}

// Etapas de produção
const productionStages: ProductionStage[] = [
  {
    id: 'viveiramento',
    name: 'Viveiramento',
    description: 'Preparação de mudas e sementes',
    icon: Sprout,
    color: 'text-green-600',
    duration: 30
  },
  {
    id: 'plantacao',
    name: 'Plantação',
    description: 'Plantio das mudas no campo',
    icon: TreePine,
    color: 'text-emerald-600',
    duration: 7
  },
  {
    id: 'capina',
    name: 'Capina',
    description: 'Limpeza e manutenção do terreno',
    icon: Scissors,
    color: 'text-yellow-600',
    duration: 3
  },
  {
    id: 'poda',
    name: 'Poda',
    description: 'Poda e manutenção das plantas',
    icon: Scissors,
    color: 'text-orange-600',
    duration: 5
  },
  {
    id: 'colheita',
    name: 'Colheita',
    description: 'Colheita dos produtos',
    icon: CheckCircle,
    color: 'text-red-600',
    duration: 14
  }
]

// Cores disponíveis para personalização
const backgroundColors = [
  { name: 'Padrão', value: 'from-green-50 to-emerald-100' },
  { name: 'Azul', value: 'from-blue-50 to-cyan-100' },
  { name: 'Roxo', value: 'from-purple-50 to-pink-100' },
  { name: 'Laranja', value: 'from-orange-50 to-amber-100' },
  { name: 'Cinza', value: 'from-gray-50 to-slate-100' },
  { name: 'Escuro', value: 'from-gray-800 to-gray-900' }
]

// Função para formatar valores em Kwanza
const formatKwanza = (value: number) => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2
  }).format(value)
}

export default function AgriculturalManagementSystem() {
  // Estados principais
  const [productionCycles, setProductionCycles] = useState<ProductionCycle[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedBg, setSelectedBg] = useState(backgroundColors[0].value)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  
  // Estados para modais
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false)
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isStageModalOpen, setIsStageModalOpen] = useState(false)
  const [editingProduction, setEditingProduction] = useState<ProductionCycle | null>(null)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [selectedCycleForStage, setSelectedCycleForStage] = useState<ProductionCycle | null>(null)
  const [selectedStage, setSelectedStage] = useState<string>('')

  // Estados para formulários
  const [productionForm, setProductionForm] = useState({
    cropType: '', variety: '', area: 0, startDate: new Date().toISOString().split('T')[0], expectedYield: 0
  })
  const [partnerForm, setPartnerForm] = useState({
    name: '', type: 'fornecedor' as const, contact: '', email: '', address: '', specialization: '', notes: ''
  })
  const [transactionForm, setTransactionForm] = useState({
    type: 'custo_producao' as const, productionCycleId: 'none', partnerId: '', amount: 0, quantity: 0, 
    coffeeType: 'none' as 'none' | 'comercial' | 'coco', description: '', 
    date: new Date().toISOString().split('T')[0], status: 'pendente' as const, notes: ''
  })
  const [stageForm, setStageForm] = useState({
    startDate: new Date().toISOString().split('T')[0], endDate: '', notes: '', cost: 0, yield: 0
  })

  // Estados para relatórios
  const [reportType, setReportType] = useState<'diario' | 'mensal' | 'anual'>('mensal')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<ReportData[]>([])

  // Carregar dados do localStorage
  useEffect(() => {
    const savedCycles = localStorage.getItem('agricultural-cycles')
    const savedPartners = localStorage.getItem('agricultural-partners')
    const savedTransactions = localStorage.getItem('agricultural-transactions')
    const savedBg = localStorage.getItem('agricultural-background')
    
    if (savedCycles) setProductionCycles(JSON.parse(savedCycles))
    if (savedPartners) setPartners(JSON.parse(savedPartners))
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions))
    if (savedBg) setSelectedBg(savedBg)
  }, [])

  // Salvar dados no localStorage
  useEffect(() => {
    localStorage.setItem('agricultural-cycles', JSON.stringify(productionCycles))
  }, [productionCycles])

  useEffect(() => {
    localStorage.setItem('agricultural-partners', JSON.stringify(partners))
  }, [partners])

  useEffect(() => {
    localStorage.setItem('agricultural-transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem('agricultural-background', selectedBg)
  }, [selectedBg])

  // Calcular dados de produção
  const calculateProductionData = () => {
    const totalCycles = productionCycles.length
    const activeCycles = productionCycles.filter(c => c.currentStage !== 'colheita' || !c.stages.colheita?.endDate).length
    const completedCycles = productionCycles.filter(c => c.stages.colheita?.status === 'completed').length
    const totalArea = productionCycles.reduce((sum, c) => sum + c.area, 0)
    const totalCost = productionCycles.reduce((sum, c) => sum + c.totalCost, 0)
    const totalYield = productionCycles.reduce((sum, c) => sum + c.actualYield, 0)
    
    const sales = transactions.filter(t => t.type === 'venda' && t.status === 'concluido')
    const totalRevenue = sales.reduce((sum, t) => sum + t.amount, 0)
    const profit = totalRevenue - totalCost

    return {
      totalCycles,
      activeCycles,
      completedCycles,
      totalArea,
      totalCost,
      totalYield,
      totalRevenue,
      profit,
      avgYieldPerHa: totalArea > 0 ? totalYield / totalArea : 0
    }
  }

  const productionData = calculateProductionData()

  // Função para gerar relatórios
  const generateReport = () => {
    const selectedDate = new Date(reportDate)
    let startDate: Date
    let endDate: Date
    let periods: string[] = []

    if (reportType === 'diario') {
      startDate = new Date(selectedDate)
      startDate.setDate(startDate.getDate() - 29)
      endDate = new Date(selectedDate)
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        periods.push(d.toISOString().split('T')[0])
      }
    } else if (reportType === 'mensal') {
      startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 11, 1)
      endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }
    } else {
      startDate = new Date(selectedDate.getFullYear() - 4, 0, 1)
      endDate = new Date(selectedDate.getFullYear(), 11, 31)
      
      for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
        periods.push(year.toString())
      }
    }

    const reports: ReportData[] = periods.map(period => {
      let periodCycles: ProductionCycle[]
      let periodTransactions: Transaction[]

      if (reportType === 'diario') {
        periodCycles = productionCycles.filter(c => c.startDate === period)
        periodTransactions = transactions.filter(t => t.status === 'concluido' && t.date === period)
      } else if (reportType === 'mensal') {
        periodCycles = productionCycles.filter(c => c.startDate.substring(0, 7) === period)
        periodTransactions = transactions.filter(t => t.status === 'concluido' && t.date.substring(0, 7) === period)
      } else {
        periodCycles = productionCycles.filter(c => c.startDate.substring(0, 4) === period)
        periodTransactions = transactions.filter(t => t.status === 'concluido' && t.date.substring(0, 4) === period)
      }

      const vendas = periodTransactions.filter(t => t.type === 'venda')
      const custos = periodTransactions.filter(t => t.type === 'custo_producao' || t.type === 'financiamento')

      const producaoData = {
        ciclos: periodCycles.length,
        area: periodCycles.reduce((sum, c) => sum + c.area, 0),
        custo: periodCycles.reduce((sum, c) => sum + c.totalCost, 0),
        rendimento: periodCycles.reduce((sum, c) => sum + c.actualYield, 0)
      }

      const vendasData = {
        quantidade: vendas.reduce((sum, t) => sum + (t.quantity || 0), 0),
        valor: vendas.reduce((sum, t) => sum + t.amount, 0),
        count: vendas.length
      }

      const custosData = {
        valor: custos.reduce((sum, t) => sum + t.amount, 0),
        count: custos.length
      }

      const lucro = vendasData.valor - custosData.valor - producaoData.custo
      const margem = vendasData.valor > 0 ? (lucro / vendasData.valor) * 100 : 0

      return {
        period: formatPeriod(period, reportType),
        producao: producaoData,
        vendas: vendasData,
        custos: custosData,
        lucro,
        margem
      }
    })

    setReportData(reports.reverse())
  }

  const formatPeriod = (period: string, type: 'diario' | 'mensal' | 'anual'): string => {
    if (type === 'diario') {
      return new Date(period).toLocaleDateString('pt-AO')
    } else if (type === 'mensal') {
      const [year, month] = period.split('-')
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ]
      return `${monthNames[parseInt(month) - 1]} ${year}`
    } else {
      return period
    }
  }

  // Função para imprimir relatório
  const handlePrintReport = () => {
    if (reportData.length === 0) {
      alert('Gere um relatório primeiro para poder imprimir.')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const reportTypeText = reportType === 'diario' ? 'Diário' : reportType === 'mensal' ? 'Mensal' : 'Anual'
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório ${reportTypeText} - Sistema Agrícola</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #16a34a; margin-bottom: 5px; }
            .header p { color: #666; margin: 0; }
            .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .summary-item { text-align: center; }
            .summary-item .value { font-size: 24px; font-weight: bold; color: #16a34a; }
            .summary-item .label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .text-right { text-align: right; }
            .text-green { color: #16a34a; }
            .text-red { color: #dc2626; }
            .text-blue { color: #2563eb; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌱 Sistema de Gestão Agrícola</h1>
            <p>Relatório ${reportTypeText} - ${new Date().toLocaleDateString('pt-AO')}</p>
          </div>
          
          <div class="summary">
            <h3>Resumo Geral</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="value">${productionData.activeCycles}</div>
                <div class="label">Ciclos Ativos</div>
              </div>
              <div class="summary-item">
                <div class="value">${productionData.totalArea} ha</div>
                <div class="label">Área Total</div>
              </div>
              <div class="summary-item">
                <div class="value">${productionData.totalYield} kg</div>
                <div class="label">Produção Total</div>
              </div>
              <div class="summary-item">
                <div class="value">${formatKwanza(productionData.totalRevenue)}</div>
                <div class="label">Receita Total</div>
              </div>
              <div class="summary-item">
                <div class="value ${productionData.profit >= 0 ? 'text-green' : 'text-red'}">${formatKwanza(productionData.profit)}</div>
                <div class="label">Lucro Líquido</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th class="text-right">Produção</th>
                <th class="text-right">Vendas</th>
                <th class="text-right">Custos</th>
                <th class="text-right">Lucro</th>
                <th class="text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(report => `
                <tr>
                  <td><strong>${report.period}</strong></td>
                  <td class="text-right">
                    <div class="text-green"><strong>${report.producao.ciclos} ciclos</strong></div>
                    <div style="font-size: 12px; color: #666;">${report.producao.area} ha</div>
                  </td>
                  <td class="text-right">
                    <div class="text-blue"><strong>${formatKwanza(report.vendas.valor)}</strong></div>
                    <div style="font-size: 12px; color: #666;">${report.vendas.quantidade} kg</div>
                  </td>
                  <td class="text-right">
                    <div class="text-red"><strong>${formatKwanza(report.custos.valor)}</strong></div>
                  </td>
                  <td class="text-right ${report.lucro >= 0 ? 'text-green' : 'text-red'}">
                    <strong>${formatKwanza(report.lucro)}</strong>
                  </td>
                  <td class="text-right ${report.margem >= 0 ? 'text-green' : 'text-red'}">
                    <strong>${report.margem.toFixed(1)}%</strong>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Relatório gerado automaticamente pelo Sistema de Gestão Agrícola</p>
            <p>Data de geração: ${new Date().toLocaleString('pt-AO')}</p>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    
    // Aguardar o carregamento e imprimir
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  // Função para baixar relatório em PDF
  const handleDownloadPDF = async () => {
    if (reportData.length === 0) {
      alert('Gere um relatório primeiro para poder baixar.')
      return
    }

    try {
      // Importação dinâmica para evitar problemas de SSR
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF()
      const reportTypeText = reportType === 'diario' ? 'Diário' : reportType === 'mensal' ? 'Mensal' : 'Anual'

      // Cabeçalho
      doc.setFontSize(20)
      doc.setTextColor(22, 163, 74) // Verde
      doc.text('🌱 Sistema de Gestão Agrícola', 20, 25)
      
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text(`Relatório ${reportTypeText}`, 20, 35)
      
      doc.setFontSize(10)
      doc.setTextColor(102, 102, 102)
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-AO')}`, 20, 45)

      // Resumo geral
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text('Resumo Geral:', 20, 60)

      const summaryData = [
        ['Ciclos Ativos', `${productionData.activeCycles}`],
        ['Área Total', `${productionData.totalArea} ha`],
        ['Produção Total', `${productionData.totalYield} kg`],
        ['Receita Total', formatKwanza(productionData.totalRevenue)],
        ['Lucro Líquido', formatKwanza(productionData.profit)]
      ]

      autoTable(doc, {
        startY: 65,
        head: [['Indicador', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
        margin: { left: 20, right: 20 }
      })

      // Tabela de dados do relatório
      const tableData = reportData.map(report => [
        report.period,
        `${report.producao.ciclos} ciclos\n${report.producao.area} ha`,
        `${formatKwanza(report.vendas.valor)}\n${report.vendas.quantidade} kg`,
        formatKwanza(report.custos.valor),
        formatKwanza(report.lucro),
        `${report.margem.toFixed(1)}%`
      ])

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Período', 'Produção', 'Vendas', 'Custos', 'Lucro', 'Margem']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 }
      })

      // Rodapé
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(102, 102, 102)
        doc.text(
          `Página ${i} de ${pageCount} - Sistema de Gestão Agrícola`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }

      // Salvar o PDF
      const fileName = `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o PDF. Tente novamente.')
    }
  }

  // Função para baixar dados em CSV
  const handleDownloadCSV = () => {
    if (reportData.length === 0) {
      alert('Gere um relatório primeiro para poder baixar.')
      return
    }

    const csvHeaders = [
      'Período',
      'Ciclos de Produção',
      'Área (ha)',
      'Custo de Produção (AOA)',
      'Rendimento (kg)',
      'Vendas (AOA)',
      'Quantidade Vendida (kg)',
      'Custos Operacionais (AOA)',
      'Lucro (AOA)',
      'Margem (%)'
    ]

    const csvData = reportData.map(report => [
      report.period,
      report.producao.ciclos,
      report.producao.area,
      report.producao.custo,
      report.producao.rendimento,
      report.vendas.valor,
      report.vendas.quantidade,
      report.custos.valor,
      report.lucro,
      report.margem.toFixed(2)
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Função para calcular progresso do ciclo
  const calculateCycleProgress = (cycle: ProductionCycle): number => {
    const completedStages = Object.values(cycle.stages).filter(s => s.status === 'completed').length
    return (completedStages / productionStages.length) * 100
  }

  // Função para obter próxima etapa
  const getNextStage = (cycle: ProductionCycle): string => {
    for (const stage of productionStages) {
      if (!cycle.stages[stage.id] || cycle.stages[stage.id].status === 'pending') {
        return stage.id
      }
    }
    return 'completed'
  }

  // Funções CRUD para ciclos de produção
  const handleSaveProduction = () => {
    const stages: any = {}
    productionStages.forEach(stage => {
      stages[stage.id] = {
        status: 'pending',
        notes: '',
        cost: 0
      }
    })

    if (editingProduction) {
      setProductionCycles(productionCycles.map(c => c.id === editingProduction.id ? 
        { ...productionForm, id: editingProduction.id, stages: editingProduction.stages, 
          currentStage: editingProduction.currentStage, totalCost: editingProduction.totalCost,
          actualYield: editingProduction.actualYield, createdAt: editingProduction.createdAt } : c
      ))
    } else {
      const newCycle: ProductionCycle = {
        ...productionForm,
        id: Date.now().toString(),
        stages,
        currentStage: 'viveiramento',
        totalCost: 0,
        actualYield: 0,
        createdAt: new Date().toISOString()
      }
      setProductionCycles([...productionCycles, newCycle])
    }
    resetProductionForm()
  }

  const handleEditProduction = (cycle: ProductionCycle) => {
    setEditingProduction(cycle)
    setProductionForm({
      cropType: cycle.cropType,
      variety: cycle.variety,
      area: cycle.area,
      startDate: cycle.startDate,
      expectedYield: cycle.expectedYield
    })
    setIsProductionModalOpen(true)
  }

  const handleDeleteProduction = (id: string) => {
    setProductionCycles(productionCycles.filter(c => c.id !== id))
  }

  const resetProductionForm = () => {
    setProductionForm({ cropType: '', variety: '', area: 0, startDate: new Date().toISOString().split('T')[0], expectedYield: 0 })
    setEditingProduction(null)
    setIsProductionModalOpen(false)
  }

  // Função para atualizar etapa
  const handleUpdateStage = () => {
    if (!selectedCycleForStage || !selectedStage) return

    const updatedCycles = productionCycles.map(cycle => {
      if (cycle.id === selectedCycleForStage.id) {
        const updatedStages = {
          ...cycle.stages,
          [selectedStage]: {
            ...cycle.stages[selectedStage],
            startDate: stageForm.startDate,
            endDate: stageForm.endDate,
            status: stageForm.endDate ? 'completed' : 'in_progress',
            notes: stageForm.notes,
            cost: stageForm.cost,
            yield: selectedStage === 'colheita' ? stageForm.yield : undefined
          }
        }

        const totalCost = Object.values(updatedStages).reduce((sum: number, stage: any) => sum + (stage.cost || 0), 0)
        const actualYield = selectedStage === 'colheita' ? stageForm.yield : cycle.actualYield
        const currentStage = stageForm.endDate ? getNextStage({ ...cycle, stages: updatedStages }) : selectedStage

        return {
          ...cycle,
          stages: updatedStages,
          totalCost,
          actualYield,
          currentStage
        }
      }
      return cycle
    })

    setProductionCycles(updatedCycles)
    resetStageForm()
  }

  const resetStageForm = () => {
    setStageForm({ startDate: new Date().toISOString().split('T')[0], endDate: '', notes: '', cost: 0, yield: 0 })
    setSelectedCycleForStage(null)
    setSelectedStage('')
    setIsStageModalOpen(false)
  }

  // Funções CRUD para parceiros
  const handleSavePartner = () => {
    if (editingPartner) {
      setPartners(partners.map(p => p.id === editingPartner.id ? 
        { ...partnerForm, id: editingPartner.id, createdAt: editingPartner.createdAt } : p
      ))
    } else {
      const newPartner: Partner = {
        ...partnerForm,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }
      setPartners([...partners, newPartner])
    }
    resetPartnerForm()
  }

  const handleEditPartner = (partner: Partner) => {
    setEditingPartner(partner)
    setPartnerForm({
      name: partner.name,
      type: partner.type,
      contact: partner.contact,
      email: partner.email,
      address: partner.address,
      specialization: partner.specialization || '',
      notes: partner.notes
    })
    setIsPartnerModalOpen(true)
  }

  const handleDeletePartner = (id: string) => {
    setPartners(partners.filter(p => p.id !== id))
  }

  const resetPartnerForm = () => {
    setPartnerForm({ name: '', type: 'fornecedor', contact: '', email: '', address: '', specialization: '', notes: '' })
    setEditingPartner(null)
    setIsPartnerModalOpen(false)
  }

  // Funções CRUD para transações
  const handleSaveTransaction = () => {
    const finalForm = {
      ...transactionForm,
      productionCycleId: transactionForm.productionCycleId === 'none' ? undefined : transactionForm.productionCycleId,
      coffeeType: transactionForm.coffeeType === 'none' ? undefined : transactionForm.coffeeType
    }

    if (editingTransaction) {
      setTransactions(transactions.map(t => t.id === editingTransaction.id ? 
        { ...finalForm, id: editingTransaction.id } : t
      ))
    } else {
      const newTransaction: Transaction = {
        ...finalForm,
        id: Date.now().toString()
      }
      setTransactions([...transactions, newTransaction])
    }
    resetTransactionForm()
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      type: transaction.type,
      productionCycleId: transaction.productionCycleId || 'none',
      partnerId: transaction.partnerId,
      amount: transaction.amount,
      quantity: transaction.quantity || 0,
      coffeeType: transaction.coffeeType || 'none',
      description: transaction.description,
      date: transaction.date,
      status: transaction.status,
      notes: transaction.notes
    })
    setIsTransactionModalOpen(true)
  }

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id))
  }

  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'custo_producao', productionCycleId: 'none', partnerId: '', amount: 0, quantity: 0,
      coffeeType: 'none', description: '', date: new Date().toISOString().split('T')[0], status: 'pendente', notes: ''
    })
    setEditingTransaction(null)
    setIsTransactionModalOpen(false)
  }

  // Função para limpar todos os dados
  const handleClearAllData = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      setProductionCycles([])
      setPartners([])
      setTransactions([])
      localStorage.removeItem('agricultural-cycles')
      localStorage.removeItem('agricultural-partners')
      localStorage.removeItem('agricultural-transactions')
    }
  }

  // Filtrar dados
  const filteredCycles = productionCycles.filter(cycle => {
    const matchesSearch = cycle.cropType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cycle.variety.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || cycle.currentStage === filterType
    return matchesSearch && matchesType
  })

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.contact.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || partner.type === filterType
    return matchesSearch && matchesType
  })

  const filteredTransactions = transactions.filter(transaction => {
    const partner = partners.find(p => p.id === transaction.partnerId)
    const matchesSearch = partner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || transaction.type === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className={`min-h-screen bg-gradient-to-br ${selectedBg} ${selectedBg.includes('gray-800') ? 'text-white' : 'text-gray-900'}`}>
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <Sprout className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Sistema de Gestão Agrícola</h1>
              <p className="text-sm opacity-70">Controle completo de produção e relatórios</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Relatórios
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Relatórios de Produção</DialogTitle>
                  <DialogDescription>Análise detalhada de produção, vendas e custos</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Tipo de Relatório</Label>
                      <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diario">Diário (30 dias)</SelectItem>
                          <SelectItem value="mensal">Mensal (12 meses)</SelectItem>
                          <SelectItem value="anual">Anual (5 anos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Data de Referência</Label>
                      <Input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button onClick={generateReport} className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Gerar
                      </Button>
                    </div>
                  </div>

                  {reportData.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-lg font-semibold">
                          Relatório {reportType === 'diario' ? 'Diário' : reportType === 'mensal' ? 'Mensal' : 'Anual'}
                        </h3>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={handlePrintReport}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                            <FileDown className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            CSV
                          </Button>
                        </div>
                      </div>

                      <ScrollArea className="h-96 border rounded-lg">
                        <div className="p-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Período</th>
                                <th className="text-right p-2">Produção</th>
                                <th className="text-right p-2">Vendas</th>
                                <th className="text-right p-2">Custos</th>
                                <th className="text-right p-2">Lucro</th>
                                <th className="text-right p-2">Margem</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.map((report, index) => (
                                <tr key={index} className="border-b hover:bg-muted/50">
                                  <td className="p-2 font-medium">{report.period}</td>
                                  <td className="p-2 text-right">
                                    <div className="text-green-600 font-medium">
                                      {report.producao.ciclos} ciclos
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {report.producao.area} ha
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">
                                    <div className="text-blue-600 font-medium">
                                      {formatKwanza(report.vendas.valor)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {report.vendas.quantidade} kg
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">
                                    <div className="text-red-600 font-medium">
                                      {formatKwanza(report.custos.valor)}
                                    </div>
                                  </td>
                                  <td className={`p-2 text-right font-medium ${
                                    report.lucro >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {formatKwanza(report.lucro)}
                                  </td>
                                  <td className={`p-2 text-right font-medium ${
                                    report.margem >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {report.margem.toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Palette className="h-4 w-4 mr-2" />
                  Cores
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Personalizar Cores</DialogTitle>
                  <DialogDescription>Escolha a cor de fundo do sistema</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  {backgroundColors.map((color) => (
                    <Button
                      key={color.name}
                      variant={selectedBg === color.value ? "default" : "outline"}
                      onClick={() => setSelectedBg(color.value)}
                      className="h-12"
                    >
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${color.value} mr-2`} />
                      {color.name}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="destructive" size="sm" onClick={handleClearAllData}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Cards de Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ciclos Ativos</CardTitle>
              <Sprout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{productionData.activeCycles}</div>
              <p className="text-xs text-muted-foreground">
                de {productionData.totalCycles} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Área Total</CardTitle>
              <Circle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productionData.totalArea} ha</div>
              <p className="text-xs text-muted-foreground">
                hectares em produção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produção Total</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{productionData.totalYield} kg</div>
              <p className="text-xs text-muted-foreground">
                {productionData.avgYieldPerHa.toFixed(1)} kg/ha médio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatKwanza(productionData.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                vendas realizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${productionData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatKwanza(productionData.profit)}
              </div>
              <p className="text-xs text-muted-foreground">
                receita - custos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs principais */}
        <Tabs defaultValue="production" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="production">Produção</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="partners">Parceiros</TabsTrigger>
          </TabsList>

          {/* Tab de Produção */}
          <TabsContent value="production" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                  <div>
                    <CardTitle>Ciclos de Produção</CardTitle>
                    <CardDescription>Gestão completa das etapas de produção agrícola</CardDescription>
                  </div>
                  <Dialog open={isProductionModalOpen} onOpenChange={setIsProductionModalOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => resetProductionForm()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Ciclo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingProduction ? 'Editar Ciclo' : 'Novo Ciclo de Produção'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Tipo de Cultura</Label>
                          <Input
                            value={productionForm.cropType}
                            onChange={(e) => setProductionForm({...productionForm, cropType: e.target.value})}
                            placeholder="Ex: Café, Milho, Feijão"
                          />
                        </div>
                        
                        <div>
                          <Label>Variedade</Label>
                          <Input
                            value={productionForm.variety}
                            onChange={(e) => setProductionForm({...productionForm, variety: e.target.value})}
                            placeholder="Ex: Arábica, Robusta"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Área (hectares)</Label>
                            <Input
                              type="number"
                              value={productionForm.area}
                              onChange={(e) => setProductionForm({
                                ...productionForm, 
                                area: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div>
                            <Label>Rendimento Esperado (kg)</Label>
                            <Input
                              type="number"
                              value={productionForm.expectedYield}
                              onChange={(e) => setProductionForm({
                                ...productionForm, 
                                expectedYield: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Data de Início</Label>
                          <Input
                            type="date"
                            value={productionForm.startDate}
                            onChange={(e) => setProductionForm({...productionForm, startDate: e.target.value})}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={resetProductionForm}>
                            Cancelar
                          </Button>
                          <Button onClick={handleSaveProduction}>
                            {editingProduction ? 'Atualizar' : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar ciclos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as etapas</SelectItem>
                      <SelectItem value="viveiramento">Viveiramento</SelectItem>
                      <SelectItem value="plantacao">Plantação</SelectItem>
                      <SelectItem value="capina">Capina</SelectItem>
                      <SelectItem value="poda">Poda</SelectItem>
                      <SelectItem value="colheita">Colheita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lista de Ciclos */}
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filteredCycles.map((cycle) => {
                      const progress = calculateCycleProgress(cycle)
                      const currentStageInfo = productionStages.find(s => s.id === cycle.currentStage)
                      
                      return (
                        <div key={cycle.id} className="border rounded-lg p-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold">{cycle.cropType} - {cycle.variety}</h3>
                                <Badge variant="outline">{cycle.area} ha</Badge>
                                {currentStageInfo && (
                                  <Badge className={currentStageInfo.color}>
                                    {currentStageInfo.name}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                Início: {new Date(cycle.startDate).toLocaleDateString('pt-AO')} • 
                                Custo: {formatKwanza(cycle.totalCost)} • 
                                Rendimento: {cycle.actualYield} kg
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Progresso</span>
                                  <span>{progress.toFixed(0)}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            </div>
                            <div className="flex space-x-2 mt-4 md:mt-0">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedCycleForStage(cycle)
                                  setSelectedStage(cycle.currentStage)
                                  setIsStageModalOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Etapa
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditProduction(cycle)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteProduction(cycle.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Etapas do ciclo */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {productionStages.map((stage) => {
                              const stageData = cycle.stages[stage.id]
                              const StageIcon = stage.icon
                              
                              return (
                                <div 
                                  key={stage.id}
                                  className={`p-2 rounded border text-center ${
                                    stageData?.status === 'completed' ? 'bg-green-50 border-green-200' :
                                    stageData?.status === 'in_progress' ? 'bg-yellow-50 border-yellow-200' :
                                    'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <StageIcon className={`h-4 w-4 mx-auto mb-1 ${stage.color}`} />
                                  <div className="text-xs font-medium">{stage.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {stageData?.status === 'completed' ? '✓' :
                                     stageData?.status === 'in_progress' ? '⏳' : '⏸️'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {filteredCycles.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum ciclo de produção encontrado
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Transações */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                  <div>
                    <CardTitle>Transações Financeiras</CardTitle>
                    <CardDescription>Controle de vendas, custos, financiamentos e recolhas</CardDescription>
                  </div>
                  <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => resetTransactionForm()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Transação
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Tipo de Transação</Label>
                          <Select value={transactionForm.type} onValueChange={(value: any) => 
                            setTransactionForm({...transactionForm, type: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="venda">Venda</SelectItem>
                              <SelectItem value="custo_producao">Custo de Produção</SelectItem>
                              <SelectItem value="financiamento">Financiamento</SelectItem>
                              <SelectItem value="compra">Compra de Insumos</SelectItem>
                              <SelectItem value="recolha">Recolha</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Parceiro</Label>
                          <Select value={transactionForm.partnerId} onValueChange={(value) => 
                            setTransactionForm({...transactionForm, partnerId: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um parceiro" />
                            </SelectTrigger>
                            <SelectContent>
                              {partners.map((partner) => (
                                <SelectItem key={partner.id} value={partner.id}>
                                  {partner.name} ({partner.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Ciclo de Produção (opcional)</Label>
                          <Select value={transactionForm.productionCycleId} onValueChange={(value) => 
                            setTransactionForm({...transactionForm, productionCycleId: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um ciclo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {productionCycles.map((cycle) => (
                                <SelectItem key={cycle.id} value={cycle.id}>
                                  {cycle.cropType} - {cycle.variety} ({cycle.area} ha)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Valor (AOA)</Label>
                            <Input
                              type="number"
                              value={transactionForm.amount}
                              onChange={(e) => setTransactionForm({
                                ...transactionForm, 
                                amount: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div>
                            <Label>Quantidade (kg)</Label>
                            <Input
                              type="number"
                              value={transactionForm.quantity}
                              onChange={(e) => setTransactionForm({
                                ...transactionForm, 
                                quantity: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                        </div>

                        {/* Campo para tipo de café - CORRIGIDO */}
                        <div>
                          <Label>Tipo de Café (opcional)</Label>
                          <Select 
                            value={transactionForm.coffeeType} 
                            onValueChange={(value: 'none' | 'comercial' | 'coco') => 
                              setTransactionForm({
                                ...transactionForm, 
                                coffeeType: value
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de café" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              <SelectItem value="comercial">Comercial</SelectItem>
                              <SelectItem value="coco">Côco</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Descrição</Label>
                          <Input
                            value={transactionForm.description}
                            onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                            placeholder="Descrição da transação"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Data</Label>
                            <Input
                              type="date"
                              value={transactionForm.date}
                              onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select value={transactionForm.status} onValueChange={(value: any) => 
                              setTransactionForm({...transactionForm, status: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="concluido">Concluído</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label>Observações</Label>
                          <Textarea
                            value={transactionForm.notes}
                            onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                            placeholder="Observações adicionais..."
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={resetTransactionForm}>
                            Cancelar
                          </Button>
                          <Button onClick={handleSaveTransaction}>
                            {editingTransaction ? 'Atualizar' : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar transações..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="venda">Vendas</SelectItem>
                      <SelectItem value="custo_producao">Custos de Produção</SelectItem>
                      <SelectItem value="financiamento">Financiamentos</SelectItem>
                      <SelectItem value="compra">Compras</SelectItem>
                      <SelectItem value="recolha">Recolhas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lista de Transações */}
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filteredTransactions.map((transaction) => {
                      const partner = partners.find(p => p.id === transaction.partnerId)
                      const cycle = productionCycles.find(c => c.id === transaction.productionCycleId)
                      
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <Badge variant={
                                transaction.type === 'venda' ? 'default' :
                                transaction.type === 'custo_producao' ? 'destructive' : 
                                transaction.type === 'financiamento' ? 'secondary' : 
                                transaction.type === 'recolha' ? 'outline' : 'outline'
                              }>
                                {transaction.type === 'custo_producao' ? 'Custo de Produção' :
                                 transaction.type === 'financiamento' ? 'Financiamento' :
                                 transaction.type === 'recolha' ? 'Recolha' :
                                 transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </Badge>
                              <span className="font-medium">{partner?.name || 'Parceiro não encontrado'}</span>
                              <Badge variant="outline">{transaction.status}</Badge>
                              {transaction.coffeeType && transaction.coffeeType !== 'none' && (
                                <Badge variant="secondary">
                                  {transaction.coffeeType === 'comercial' ? 'Comercial' : 'Côco'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {transaction.description} • {formatKwanza(transaction.amount)}
                              {transaction.quantity && ` • ${transaction.quantity} kg`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString('pt-AO')}
                              {cycle && ` • ${cycle.cropType} - ${cycle.variety}`}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditTransaction(transaction)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteTransaction(transaction.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    {filteredTransactions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Parceiros */}
          <TabsContent value="partners" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                  <div>
                    <CardTitle>Gestão de Parceiros</CardTitle>
                    <CardDescription>Clientes, fornecedores, trabalhadores, técnicos e financiados</CardDescription>
                  </div>
                  <Dialog open={isPartnerModalOpen} onOpenChange={setIsPartnerModalOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => resetPartnerForm()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Parceiro
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingPartner ? 'Editar Parceiro' : 'Novo Parceiro'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Nome</Label>
                          <Input
                            value={partnerForm.name}
                            onChange={(e) => setPartnerForm({...partnerForm, name: e.target.value})}
                            placeholder="Nome do parceiro"
                          />
                        </div>
                        
                        <div>
                          <Label>Tipo</Label>
                          <Select value={partnerForm.type} onValueChange={(value: any) => 
                            setPartnerForm({...partnerForm, type: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cliente">Cliente</SelectItem>
                              <SelectItem value="fornecedor">Fornecedor</SelectItem>
                              <SelectItem value="trabalhador">Trabalhador</SelectItem>
                              <SelectItem value="tecnico">Técnico</SelectItem>
                              <SelectItem value="financiado">Financiado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Contacto</Label>
                          <Input
                            value={partnerForm.contact}
                            onChange={(e) => setPartnerForm({...partnerForm, contact: e.target.value})}
                            placeholder="Telefone ou WhatsApp"
                          />
                        </div>

                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={partnerForm.email}
                            onChange={(e) => setPartnerForm({...partnerForm, email: e.target.value})}
                            placeholder="email@exemplo.com"
                          />
                        </div>

                        <div>
                          <Label>Endereço</Label>
                          <Input
                            value={partnerForm.address}
                            onChange={(e) => setPartnerForm({...partnerForm, address: e.target.value})}
                            placeholder="Endereço completo"
                          />
                        </div>

                        <div>
                          <Label>Especialização</Label>
                          <Input
                            value={partnerForm.specialization}
                            onChange={(e) => setPartnerForm({...partnerForm, specialization: e.target.value})}
                            placeholder="Ex: Café, Irrigação, Pragas"
                          />
                        </div>

                        <div>
                          <Label>Observações</Label>
                          <Textarea
                            value={partnerForm.notes}
                            onChange={(e) => setPartnerForm({...partnerForm, notes: e.target.value})}
                            placeholder="Observações adicionais..."
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={resetPartnerForm}>
                            Cancelar
                          </Button>
                          <Button onClick={handleSavePartner}>
                            {editingPartner ? 'Atualizar' : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar parceiros..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="cliente">Clientes</SelectItem>
                      <SelectItem value="fornecedor">Fornecedores</SelectItem>
                      <SelectItem value="trabalhador">Trabalhadores</SelectItem>
                      <SelectItem value="tecnico">Técnicos</SelectItem>
                      <SelectItem value="financiado">Financiados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lista de Parceiros */}
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filteredPartners.map((partner) => (
                      <div key={partner.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{partner.name}</span>
                            <Badge variant={
                              partner.type === 'cliente' ? 'default' :
                              partner.type === 'fornecedor' ? 'secondary' : 
                              partner.type === 'trabalhador' ? 'outline' : 
                              partner.type === 'financiado' ? 'destructive' : 'destructive'
                            }>
                              {partner.type}
                            </Badge>
                            {partner.specialization && (
                              <Badge variant="outline">{partner.specialization}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {partner.contact} • {partner.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {partner.address}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditPartner(partner)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeletePartner(partner.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredPartners.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum parceiro encontrado
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal para atualizar etapas */}
        <Dialog open={isStageModalOpen} onOpenChange={setIsStageModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Atualizar Etapa de Produção</DialogTitle>
              <DialogDescription>
                {selectedCycleForStage && `${selectedCycleForStage.cropType} - ${selectedCycleForStage.variety}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Etapa</Label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productionStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name} - {stage.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={stageForm.startDate}
                    onChange={(e) => setStageForm({...stageForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Data de Conclusão</Label>
                  <Input
                    type="date"
                    value={stageForm.endDate}
                    onChange={(e) => setStageForm({...stageForm, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Custo (AOA)</Label>
                  <Input
                    type="number"
                    value={stageForm.cost}
                    onChange={(e) => setStageForm({
                      ...stageForm, 
                      cost: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                {selectedStage === 'colheita' && (
                  <div>
                    <Label>Rendimento (kg)</Label>
                    <Input
                      type="number"
                      value={stageForm.yield}
                      onChange={(e) => setStageForm({
                        ...stageForm, 
                        yield: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={stageForm.notes}
                  onChange={(e) => setStageForm({...stageForm, notes: e.target.value})}
                  placeholder="Observações sobre esta etapa..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetStageForm}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateStage}>
                  Atualizar Etapa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}