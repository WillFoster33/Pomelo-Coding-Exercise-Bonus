import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Clock, CheckCircle, RefreshCw } from 'lucide-react';

const App = () => {
  // State hooks for managing application data
  const [summary, setSummary] = useState({
    availableCredit: 0,
    payableBalance: 0,
    pendingTransactions: [],
    settledTransactions: []
  });
  const [error, setError] = useState(null);
  const [newEvent, setNewEvent] = useState({
    eventType: 'TXN_AUTHED',
    eventTime: '',
    txnId: '',
    amount: '',
  });

  // Function to fetch summary data from the backend
  const fetchSummary = async () => {
    try {
      console.log("Fetching summary...");
      const response = await fetch('http://localhost:8000/summary');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched summary:", data);
      setSummary(data);
      setError(null);
    } catch (e) {
      console.error("Fetch error:", e);
      setError(`Failed to fetch summary: ${e.message}`);
    }
  };

  // Effect hook to fetch summary
  useEffect(() => {
    fetchSummary();
  }, []);

  // Handler for input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEvent(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler for submitting a new event
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventData = { ...newEvent };
      if (eventData.eventType === 'PAYMENT_POSTED' && eventData.amount === '') {
        delete eventData.amount;
      }
      console.log("Submitting event:", eventData);
      const response = await fetch('http://localhost:8000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Event submission result:", result);
      await fetchSummary();
      setNewEvent({ eventType: 'TXN_AUTHED', eventTime: '', txnId: '', amount: '' });
      setError(null);
    } catch (e) {
      console.error("Submit error:", e);
      setError(`Failed to submit event: ${e.message}`);
    }
  };

  // Handler for resetting card activity
  const handleReset = async () => {
    try {
      console.log("Resetting card activity...");
      const response = await fetch('http://localhost:8000/reset', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Reset result:", data);
      setSummary(data);
      setError(null);
    } catch (e) {
      console.error("Reset error:", e);
      setError(`Failed to reset card activity: ${e.message}`);
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Main component render
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4 animate-gradient-x">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-4xl w-full font-sans">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Pomelo Credit Card Dashboard</h1>
          <button 
            onClick={handleReset}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105"
          >
            <RefreshCw className="mr-2" size={20} />
            Reset
          </button>
        </div>
        
        {/* Error display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Credit summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center mb-4">
              <CreditCard className="mr-2" />
              <h2 className="text-xl font-semibold">Available Credit</h2>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(summary.availableCredit)}</p>
          </div>
          <div className="bg-gradient-to-r from-pink-500 to-red-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center mb-4">
              <DollarSign className="mr-2" />
              <h2 className="text-xl font-semibold">Payable Balance</h2>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(summary.payableBalance)}</p>
          </div>
        </div>

        {/* Transactions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Transactions</h2>
          <div className="bg-gray-50 rounded-lg shadow p-6">
            {/* Pending Transactions */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center text-orange-600">
                <Clock className="mr-2" size={20} />
                Pending Transactions
              </h3>
              {summary.pendingTransactions.length > 0 ? (
                <ul className="space-y-2">
                  {summary.pendingTransactions.map((transaction, index) => (
                    <li key={index} className="flex justify-between items-center border-b border-gray-200 py-2">
                      <span className="font-medium">{transaction.id}</span>
                      <span className="text-orange-600 font-semibold">
                        {formatCurrency(transaction.amount)} @ {transaction.time}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No pending transactions</p>
              )}
            </div>
            {/* Settled Transactions */}
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center text-green-600">
                <CheckCircle className="mr-2" size={20} />
                Settled Transactions
              </h3>
              {summary.settledTransactions.length > 0 ? (
                <ul className="space-y-2">
                  {summary.settledTransactions.map((transaction, index) => (
                    <li key={index} className="flex justify-between items-center border-b border-gray-200 py-2">
                      <span className="font-medium">{transaction.id}</span>
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(transaction.amount)} @ {transaction.initialTime} 
                        <br />
                        <span className="text-xs">(finalized @ {transaction.finalTime})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No settled transactions</p>
              )}
            </div>
          </div>
        </div>

        {/* New Event Form */}
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Add New Event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select
              name="eventType"
              value={newEvent.eventType}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="TXN_AUTHED">Transaction Authorized</option>
              <option value="TXN_SETTLED">Transaction Settled</option>
              <option value="PAYMENT_INITIATED">Payment Initiated</option>
              <option value="PAYMENT_POSTED">Payment Posted</option>
            </select>
            <input
              type="datetime-local"
              name="eventTime"
              value={newEvent.eventTime}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              name="txnId"
              value={newEvent.txnId}
              onChange={handleInputChange}
              placeholder="Transaction ID"
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            <input
              type="number"
              name="amount"
              value={newEvent.amount}
              onChange={handleInputChange}
              placeholder="Amount (optional for Payment Posted)"
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required={newEvent.eventType !== 'PAYMENT_POSTED'}
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-6 rounded-md hover:from-indigo-600 hover:to-purple-700 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105"
          >
            Add Event
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;