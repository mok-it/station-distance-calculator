import {InfoCircle} from '@mynaui/icons-react';
import {useState} from 'react';
import {InfoModal} from './components/InfoModal.tsx';
import Map from './components/Map';
import {AuthProvider, useAuth} from './contexts/AuthContext';

function AppContent() {
    const {user, loading, signIn, signOut} = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (loading) {
        return <p>Betöltés...</p>;
    }

    return (
        <div className="mx-auto my-4 p-4">
            <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}/>
            <div className="flex flex-row justify-between space-x-3 pb-6">
                <div className='flex flex-row items-center space-x-2'>
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        Állomástávolság-számító
                    </h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-gray-500 hover:text-indigo-600 transition duration-150 p-1.5 rounded-full bg-gray-100 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Az alkalmazás működésének magyarázata"
                    >
                        <InfoCircle className='w-4 h-4'/>
                    </button>
                </div>
                {user ? (
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500" onClick={() => {if(confirm('Biztosan ki szeretnél jelentkezni?')) signOut();}}>
                        Kijelentkezés
                    </button>
                ) : (
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500" onClick={signIn}>
                        Bejelentkezés Google-fiókkal
                    </button>
                )}
            </div>
            {user ? (
                <Map/>
            ) : (
                <p>Jelentkezz be az oldal használatához!</p>
            )}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent/>
        </AuthProvider>
    );
}

export default App;
