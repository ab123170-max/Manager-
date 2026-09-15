/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  DollarSign,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { ExpenseRecord } from '../../types';
import {
  getExpenseRecords,
  recordExpense,
  deleteExpense,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

export const ExpensesView: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(getExpenseRecords());
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('logistics');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setExpenses(getExpenseRecords());
    });
  }, []);

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      alert('Please enter expense title and valid amount.');
      return;
    }

    recordExpense({
      title: title.trim(),
      category,
      amount,
      paymentMethod,
      notes,
      date: new Date().toISOString(),
    });

    setFeedback(`Recorded expense: ${title} ($${amount.toFixed(2)})`);
    setTitle('');
    setAmount(0);
    setNotes('');
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Operational Outflow</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Operating Expenses (${totalExpenseAmount.toFixed(2)})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track business overhead costs, warehouse rent, logistics freight, utilities, and packaging materials.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add Expense Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
          >
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" />
              <span>Log New Expense</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Expense Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly Warehouse Rent"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="logistics">Logistics &amp; Freight</option>
                  <option value="rent">Rent &amp; Utilities</option>
                  <option value="packaging">Packaging Materials</option>
                  <option value="salary">Staff &amp; Labor</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other Overhead</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="bank_transfer">Bank Wire / ACH</option>
                <option value="credit_card">Business Credit Card</option>
                <option value="cash">Petty Cash</option>
                <option value="check">Check</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Receipt reference or vendor invoice #"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition-all"
            >
              Add Expense Entry
            </button>
          </form>
        </div>

        {/* Right: Expense List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
            {expenses.length > 0 ? (
              expenses.map((e) => (
                <div key={e.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs">{e.title}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {new Date(e.date).toLocaleDateString()} • <span className="uppercase text-slate-400 font-bold">{e.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-rose-600 text-sm">
                      -${Number(e.amount).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteExpense(e.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-400">
                No operating expenses logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
