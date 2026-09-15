/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Check,
  XCircle,
  RotateCcw,
  DollarSign,
  User,
  Phone,
  MapPin,
  Facebook,
  MessageCircle,
  Sparkles,
  Layers,
  AlertTriangle,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import {
  MarketplaceOrder,
  MarketplaceOrderStatus,
  SavedInventoryItem,
  MarketplaceSubView,
} from '../../types';
import {
  getMarketplaceOrders,
  getProducts,
  createMarketplaceOrder,
  updateMarketplaceOrderStatus,
  cancelMarketplaceOrder,
  processMarketplaceReturn,
  subscribeToStore,
} from '../../utils/unifiedDataStore';

interface MarketplaceOrdersViewProps {
  onNavigateSubView: (view: MarketplaceSubView) => void;
}

export const MarketplaceOrdersView: React.FC<MarketplaceOrdersViewProps> = ({
  onNavigateSubView,
}) => {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [products, setProducts] = useState<SavedInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MarketplaceOrderStatus>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);

  // New Order Modal State
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderCustomerAddress, setOrderCustomerAddress] = useState('');
  const [orderCustomerCity, setOrderCustomerCity] = useState('');
  const [orderChannel, setOrderChannel] = useState<'facebook' | 'whatsapp' | 'tiktok' | 'pos' | 'marketplace'>('facebook');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderPaymentStatus, setOrderPaymentStatus] = useState<'pending' | 'paid' | 'cod'>('cod');
  const [orderShippingFee, setOrderShippingFee] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  useEffect(() => {
    const load = () => {
      setOrders(getMarketplaceOrders());
      setProducts(getProducts());
    };
    load();
    return subscribeToStore(load);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
      if (channelFilter !== 'all' && ord.channel !== channelFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNum = ord.orderNumber.toLowerCase().includes(q);
        const matchCust = ord.customerName.toLowerCase().includes(q);
        const matchPhone = (ord.customerPhone || '').toLowerCase().includes(q);
        const matchItems = ord.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!matchNum && !matchCust && !matchPhone && !matchItems) return false;
      }
      return true;
    });
  }, [orders, statusFilter, channelFilter, searchTerm]);

  const handleStatusTransition = (orderId: string, nextStatus: MarketplaceOrderStatus) => {
    const res = updateMarketplaceOrderStatus(orderId, nextStatus);
    if (res.success && res.order) {
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(res.order);
      }
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');
    setOrderSuccess('');

    if (!orderCustomerName.trim()) {
      setOrderError('Customer name is required.');
      return;
    }
    if (!selectedProductId) {
      setOrderError('Please select a product.');
      return;
    }
    if (orderQuantity <= 0) {
      setOrderError('Quantity must be greater than 0.');
      return;
    }

    const res = createMarketplaceOrder({
      customerName: orderCustomerName.trim(),
      customerPhone: orderCustomerPhone.trim(),
      customerAddress: orderCustomerAddress.trim(),
      customerCity: orderCustomerCity.trim(),
      channel: orderChannel,
      items: [
        {
          productId: selectedProductId,
          quantity: orderQuantity,
        },
      ],
      shippingFee: orderShippingFee,
      paymentStatus: orderPaymentStatus,
      notes: orderNotes.trim(),
      initialStatus: 'pending',
    });

    if (!res.success) {
      setOrderError(res.message);
    } else {
      setOrderSuccess(res.message);
      setTimeout(() => {
        setShowNewOrderModal(false);
        setOrderCustomerName('');
        setOrderCustomerPhone('');
        setOrderCustomerAddress('');
        setSelectedProductId('');
        setOrderQuantity(1);
        setOrderNotes('');
        setOrderSuccess('');
      }, 1000);
    }
  };

  return (
    <div id="marketplace-orders-container" className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Marketplace Orders & Stock Fulfillment</h2>
          <p className="text-xs text-slate-500">
            Lifecycle state machine with automatic stock reservations, deductions, and accounting ledger synchronization
          </p>
        </div>
        <button
          id="btn-create-order-manual"
          onClick={() => {
            setOrderError('');
            setShowNewOrderModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          + Record Marketplace Order
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-orders"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order #, customer name, phone, or item..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Order Statuses ({orders.length})</option>
              <option value="pending">Pending (Stock Reserved)</option>
              <option value="confirmed">Confirmed</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Channels</option>
              <option value="facebook">Facebook</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="tiktok">TikTok</option>
              <option value="pos">POS / Store</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Order # & Channel</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items & Qty</th>
                <th className="py-3.5 px-4 text-center">Stock State</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Quick Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-base font-medium text-slate-600">No marketplace orders found</p>
                    <p className="text-xs text-slate-400 mt-1">Orders placed via Facebook, WhatsApp, or TikTok will appear here</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const statusColors: Record<string, string> = {
                    draft: 'bg-slate-100 text-slate-700 border-slate-300',
                    pending: 'bg-amber-50 text-amber-700 border-amber-300',
                    confirmed: 'bg-blue-50 text-blue-700 border-blue-300',
                    packed: 'bg-indigo-50 text-indigo-700 border-indigo-300',
                    shipped: 'bg-purple-50 text-purple-700 border-purple-300',
                    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                    cancelled: 'bg-rose-50 text-rose-700 border-rose-300',
                    returned: 'bg-slate-100 text-slate-700 border-slate-300',
                    refunded: 'bg-slate-100 text-slate-700 border-slate-300',
                  };

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order # & Channel */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-bold text-slate-900">{ord.orderNumber}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          {ord.channel === 'facebook' ? (
                            <Facebook className="w-3 h-3 text-blue-600" />
                          ) : ord.channel === 'whatsapp' ? (
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                          ) : ord.channel === 'tiktok' ? (
                            <Sparkles className="w-3 h-3 text-pink-500" />
                          ) : null}
                          <span className="capitalize">{ord.channel}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{ord.customerName}</div>
                        {ord.customerPhone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{ord.customerPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="text-xs text-slate-800 font-medium">
                          {ord.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                        </div>
                      </td>

                      {/* Stock State */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {ord.isStockReserved && !ord.isStockDeducted ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Reserved
                          </span>
                        ) : ord.isStockDeducted ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Deducted
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Released
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">${ord.totalAmount.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{ord.paymentStatus || 'COD'}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            statusColors[ord.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>

                      {/* Actions & State Transitions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {ord.status === 'pending' && (
                            <button
                              onClick={() => handleStatusTransition(ord.id, 'confirmed')}
                              className="px-2 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                            >
                              Confirm
                            </button>
                          )}
                          {ord.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusTransition(ord.id, 'packed')}
                              className="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                            >
                              Pack
                            </button>
                          )}
                          {ord.status === 'packed' && (
                            <button
                              onClick={() => handleStatusTransition(ord.id, 'shipped')}
                              className="px-2 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
                            >
                              Ship
                            </button>
                          )}
                          {ord.status === 'shipped' && (
                            <button
                              onClick={() => handleStatusTransition(ord.id, 'delivered')}
                              className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                            >
                              Delivered
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ORDER MODAL */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <ShoppingBag className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Record Marketplace Order</h3>
                  <p className="text-xs text-slate-500">Creates order and reserves stock automatically</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              {orderError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}
              {orderSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{orderSuccess}</span>
                </div>
              )}

              {/* Channel */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sales Channel *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderChannel('facebook')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${
                      orderChannel === 'facebook'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Facebook className="w-3.5 h-3.5" /> Facebook
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderChannel('whatsapp')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${
                      orderChannel === 'whatsapp'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderChannel('tiktok')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${
                      orderChannel === 'tiktok'
                        ? 'bg-slate-900 text-pink-400 border-slate-900'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> TikTok
                  </button>
                </div>
              </div>

              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Product from Inventory --</option>
                  {products.map((p) => {
                    const avail = (p.stockQuantity || 0) - (p.reservedStock || 0);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.productName} (Available: {avail} {p.unit || 'units'} @ {p.sellingPrice || p.mrp || '$0'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity & Shipping */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(parseInt(e.target.value, 10) || 1)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery / Shipping ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={orderShippingFee}
                    onChange={(e) => setOrderShippingFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={orderCustomerName}
                      onChange={(e) => setOrderCustomerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={orderCustomerPhone}
                      onChange={(e) => setOrderCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={orderCustomerAddress}
                    onChange={(e) => setOrderCustomerAddress(e.target.value)}
                    placeholder="Street address, apartment, or pickup spot"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method / Type
                  </label>
                  <select
                    value={orderPaymentStatus}
                    onChange={(e) => setOrderPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cod">Cash on Delivery (COD)</option>
                    <option value="paid">Paid Online / Card / UPI</option>
                    <option value="pending">Pending Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Notes
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Customer instructions"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  Create & Reserve Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAIL & STATE MACHINE MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Order Management
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              {/* Status Ribbon */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Current Order State</div>
                  <div className="font-bold text-slate-900 text-base uppercase mt-0.5">
                    {selectedOrder.status}
                  </div>
                </div>
                <div>
                  {selectedOrder.isStockReserved && !selectedOrder.isStockDeducted && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md">
                      Stock Reserved
                    </span>
                  )}
                  {selectedOrder.isStockDeducted && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                      Stock Deducted & Sales Logged
                    </span>
                  )}
                </div>
              </div>

              {/* State Machine Transition Actions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Change Order State:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusTransition(selectedOrder.id, 'pending')}
                    disabled={selectedOrder.status === 'pending'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-amber-50 text-amber-800 border-amber-300 disabled:opacity-40"
                  >
                    Pending (Reserve)
                  </button>
                  <button
                    onClick={() => handleStatusTransition(selectedOrder.id, 'confirmed')}
                    disabled={selectedOrder.status === 'confirmed'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-blue-50 text-blue-800 border-blue-300 disabled:opacity-40"
                  >
                    Confirm Order
                  </button>
                  <button
                    onClick={() => handleStatusTransition(selectedOrder.id, 'packed')}
                    disabled={selectedOrder.status === 'packed'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-indigo-50 text-indigo-800 border-indigo-300 disabled:opacity-40"
                  >
                    Mark Packed
                  </button>
                  <button
                    onClick={() => handleStatusTransition(selectedOrder.id, 'shipped')}
                    disabled={selectedOrder.status === 'shipped'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-purple-50 text-purple-800 border-purple-300 disabled:opacity-40"
                  >
                    Ship Order
                  </button>
                  <button
                    onClick={() => handleStatusTransition(selectedOrder.id, 'delivered')}
                    disabled={selectedOrder.status === 'delivered'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-300 disabled:opacity-40"
                  >
                    Delivered
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Cancel this order and return any reserved/deducted stock?')) {
                        handleStatusTransition(selectedOrder.id, 'cancelled');
                      }
                    }}
                    disabled={selectedOrder.status === 'cancelled'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-rose-50 text-rose-800 border-rose-300 disabled:opacity-40"
                  >
                    Cancel Order
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Process customer return and restock items to inventory?')) {
                        handleStatusTransition(selectedOrder.id, 'returned');
                      }
                    }}
                    disabled={selectedOrder.status === 'returned'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-slate-100 text-slate-800 border-slate-300 disabled:opacity-40"
                  >
                    Process Return
                  </button>
                </div>
              </div>

              {/* Customer & Delivery */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Customer Details</div>
                  <div className="font-bold text-slate-900 mt-1">{selectedOrder.customerName}</div>
                  {selectedOrder.customerPhone && (
                    <div className="text-xs text-slate-600 mt-0.5">{selectedOrder.customerPhone}</div>
                  )}
                  {selectedOrder.customerAddress && (
                    <div className="text-xs text-slate-500 mt-0.5">{selectedOrder.customerAddress}</div>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Channel & Payment</div>
                  <div className="font-semibold text-slate-900 capitalize mt-1">
                    {selectedOrder.channel} Marketplace
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Payment: <span className="font-bold uppercase">{selectedOrder.paymentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium text-slate-900">{it.productName}</td>
                        <td className="py-2 px-3 text-center">{it.quantity}</td>
                        <td className="py-2 px-3 text-right">${it.unitPrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ${it.totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right">
                        Grand Total:
                      </td>
                      <td className="py-2 px-3 text-right text-sm text-indigo-700">
                        ${selectedOrder.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Status Audit History */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lifecycle Audit History
                </label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedOrder.statusHistory.map((h, i) => (
                    <div key={i} className="text-xs flex items-start gap-2">
                      <span className="font-bold uppercase text-slate-800 shrink-0">
                        [{h.status}]
                      </span>
                      <span className="text-slate-600">{h.notes || 'Status updated'}</span>
                      <span className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">
                        {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
