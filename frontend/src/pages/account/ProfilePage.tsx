import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, ShieldCheck, Mail, BookOpen, HelpCircle, Send, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'

type Ticket = { id: string; subject: string; description: string; status: 'Submitted' | 'In Review' | 'Resolved'; createdAt: string }

export const ProfilePage: React.FC = () => {
  const { student, logout } = useAuth()
  const studentName = student?.full_name || student?.external_student_id || 'Student'
  const studentEmail = student?.email || 'Not provided'
  const studentId = student?.external_student_id || student?.id || 'N/A'

  const [subject, setSubject] = useState('Account or learning support')
  const [description, setDescription] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const raw = localStorage.getItem('codeknot_support_tickets')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.support.listTickets().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setTickets(data.map(d => ({
          id: d.id,
          subject: d.subject,
          description: d.message,
          status: d.status === 'RESOLVED' ? 'Resolved' : d.status === 'IN_PROGRESS' ? 'In Review' : 'Submitted',
          createdAt: d.created_at || new Date().toISOString(),
        })))
      }
    }).catch(() => {})
  }, [])

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    const desc = description.trim()
    try {
      const created = await api.support.createTicket({
        category: 'Account & Support',
        subject: subject.trim(),
        message: desc,
      })
      const ticket: Ticket = {
        id: created.id,
        subject: created.subject,
        description: created.message,
        status: 'Submitted',
        createdAt: created.created_at || new Date().toISOString(),
      }
      setTickets(prev => [ticket, ...prev])
    } catch {
      const ticket: Ticket = {
        id: `TKT-${Date.now()}`,
        subject: subject.trim(),
        description: desc,
        status: 'Submitted',
        createdAt: new Date().toISOString(),
      }
      setTickets(prev => [ticket, ...prev])
      try { localStorage.setItem('codeknot_support_tickets', JSON.stringify([ticket, ...tickets])) } catch {}
    }
    setDescription('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <div className="text-xs text-slate-500 mb-1">CodeKnot / Profile & Support</div>
        <h1 className="text-2xl font-extrabold text-[#14213D] tracking-tight">Profile, Account & Support</h1>
        <p className="mt-1 text-xs text-slate-600">Manage your student profile, account details, and support requests in one place.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-[#2563EB] text-white flex items-center justify-center mx-auto text-3xl font-black border-4 border-white shadow-md">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{studentName}</h2>
              <p className="text-xs font-semibold text-[#2563EB] bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-100 mt-1">Student Account</p>
            </div>
            <div className="pt-2 text-left space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <div><p className="text-[10px] text-slate-400 uppercase font-bold">Email</p><p className="font-semibold text-slate-700 break-all">{studentEmail}</p></div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <div><p className="text-[10px] text-slate-400 uppercase font-bold">Student ID</p><p className="font-semibold text-slate-700 break-all">{studentId}</p></div>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Quick Links</h3>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/materials" className="text-[#2563EB] hover:underline flex items-center gap-2"><BookOpen className="w-4 h-4" /> Study Materials</Link>
              <Link to="/help" className="text-[#2563EB] hover:underline flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Help & Guides</Link>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50" onClick={logout}>Sign Out</Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div><label className="block font-bold text-slate-500 mb-1">Full Name</label><div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800">{studentName}</div></div>
              <div><label className="block font-bold text-slate-500 mb-1">Email Address</label><div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800">{studentEmail}</div></div>
              <div><label className="block font-bold text-slate-500 mb-1">Username / Student ID</label><div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800">{studentId}</div></div>
              <div><label className="block font-bold text-slate-500 mb-1">Account Status</label><div className="p-3 rounded-xl bg-teal-50 border border-teal-200 font-semibold text-teal-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Active</div></div>
            </div>
            <p className="text-[11px] text-slate-500">To update profile details in this version, contact support using the form below.</p>
          </Card>

          <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><User className="w-4 h-4 text-[#2563EB]" /> Support Ticket</h3>
            <p className="text-xs text-slate-600">Submit an issue and track its status. Your submitted tickets are saved in your account support history on this device.</p>
            {saved && <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 font-medium">Support ticket submitted successfully.</div>}
            <form onSubmit={submitTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issue Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required placeholder="Describe the issue you are facing..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm" />
              </div>
              <Button type="submit" variant="primary" className="bg-[#2563EB] hover:bg-[#1d4ed8]" leftIcon={<Send className="w-4 h-4" />}>Submit Ticket</Button>
            </form>

            <div className="pt-2 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ticket Status</h4>
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-500">No support tickets submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {tickets.slice(0, 5).map(t => (
                    <div key={t.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-800">{t.subject}</span><span className="px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200 font-semibold">{t.status}</span></div>
                      <p className="text-slate-600 mt-1 line-clamp-2">{t.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{t.id} • {new Date(t.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}