import { useState, useEffect } from 'react';

interface Transaction {
  id: number;
  text: string;
  amount: number;
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [text, setText] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem('budget');
    return saved ? Number(saved) : 0;
  });

  
  const API_URL = 'https://api-finanzas-matias.onrender.com/transactions'; 

  // --- CARGAR DATOS ---
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    localStorage.setItem('budget', budget.toString());
  }, [budget]);

  // --- PREPARAR EDICIÓN ---
  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setText(transaction.text);
    setAmount(transaction.amount.toString());
  };

  // --- GUARDAR (CREAR O EDITAR) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || !amount) return;

    const transactionData = { text, amount: Number(amount) };

    if (editingId) {
      // MODO EDICIÓN (PUT)
      try {
        const response = await fetch(`${API_URL}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData)
        });

        if (response.ok) {
          const updatedTransaction = await response.json();
          setTransactions(transactions.map(t => t.id === editingId ? updatedTransaction : t));
          setEditingId(null);
        }
      } catch (error) {
        console.error("Error al editar:", error);
      }

    } else {
      // MODO CREACIÓN (POST)
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData)
        });

        if (response.ok) {
          const newTransaction = await response.json();
          setTransactions([...transactions, newTransaction]);
        }
      } catch (error) {
        console.error("Error al crear:", error);
      }
    }

    setText('');
    setAmount('');
  };

  // --- BORRAR ---
  const deleteTransaction = async (id: number) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error al borrar:", error);
    }
  };

  // CÁLCULOS
  const totalExpenses = transactions.reduce((acc, item) => acc + item.amount, 0);
  const remaining = budget - totalExpenses;
  const progressPercentage = Math.min((totalExpenses / (budget || 1)) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-6 font-sans">
      
      <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
        Gestor de Finanzas
      </h1>

      {/* --- SECCIÓN PRESUPUESTO --- */}
      <div className="w-full max-w-lg bg-gray-800 p-6 rounded-xl shadow-2xl mb-8 border border-gray-700">
        <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-wide">
          Presupuesto Mensual
        </label>
        
        <div className="relative mb-4">
          <span className="absolute left-3 top-2.5 text-gray-400">$</span>
          <input 
            type="number" 
            value={budget === 0 ? '' : budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full pl-8 p-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition text-xl font-mono"
            placeholder="0.00"
          />
        </div>

        {/* Barra de Progreso */}
        <div className="flex justify-between text-sm mb-1 font-medium">
          <span className="text-gray-400">Gastado: <span className="text-white">${totalExpenses}</span></span>
          <span className={`${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            Disponible: ${remaining}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${remaining < 0 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-blue-500'}`} 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* --- FORMULARIO --- */}
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2">
          {editingId ? '✏️ Editando Gasto' : '➕ Agregar Nuevo Gasto'}
        </h3>
        
        <div className="flex gap-3 mb-4">
          <input 
            type="text" 
            placeholder="Descripción (ej: Supermercado)" 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-600 focus:border-blue-500 outline-none"
          />
          <input 
            type="number" 
            placeholder="Monto" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            className="w-28 p-3 rounded-lg bg-gray-900 border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button 
            type="submit"
            className={`flex-1 font-bold py-3 px-4 rounded-lg transition transform active:scale-95 ${
              editingId 
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {editingId ? 'Guardar Cambios' : 'Agregar Gasto'}
          </button>
          
          {editingId && (
            <button 
              type="button" 
              onClick={() => { setEditingId(null); setText(''); setAmount(''); }}
              className="px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* --- LISTA DE GASTOS --- */}
      <div className="w-full max-w-lg space-y-3 pb-10">
        {transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-4xl mb-2">💸</p>
            <p>No hay gastos registrados aún.</p>
          </div>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="group flex justify-between items-center p-4 rounded-lg bg-gray-800 hover:bg-gray-750 border-l-4 border-emerald-500 shadow-sm transition-all hover:translate-x-1">
              <div className="flex flex-col">
                <span className="font-semibold text-lg text-gray-100">{t.text}</span>
                <span className="text-xs text-gray-500">ID: {t.id.toString().slice(-4)}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="font-bold text-xl text-emerald-400">${t.amount}</span>
                
                <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEditing(t)}
                    className="p-2 bg-gray-700 hover:bg-yellow-600 hover:text-white text-yellow-500 rounded-md transition"
                    title="Editar"
                  >
                    ✎
                  </button>
                  <button 
                    onClick={() => deleteTransaction(t.id)}
                    className="p-2 bg-gray-700 hover:bg-red-600 hover:text-white text-red-500 rounded-md transition"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default App;