import {FC, Fragment} from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InfoModal: FC<InfoModalProps> = ({ isOpen, onClose }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>

                {/* Backdrop overlay and transition */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true" />
                </Transition.Child>

                {/* Modal panel container and transition */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            {/* Dialog.Panel is the actual modal content */}
                            <Dialog.Panel className="bg-white text-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300">

                                {/* Modal Header */}
                                <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center">
                                    <Dialog.Title as="h2" className="text-xl font-extrabold text-indigo-700">
                                        Az alkalmazás működése
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-500 hover:text-red-500 transition duration-150 p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                                        aria-label="Bezárás"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6 space-y-4 text-sm sm:text-base">
                                    <p>
                                        Ez az alkalmazás pontok (állomások) közötti távolságok kiszámítására szolgál. Add meg a felületen való kattintgatással az összes állomást, nevezd el őket, és generáld ki az Excel-táblázatot, ami tartalmazza bármely két állomás közötti távolságot.
                                    </p>

                                    <p>Egy helyen egyszerre több állomás is lehet (összevont állomások), ezért egy állomásnak több nevet is lehet adni. Ha ilyen áll fent, a fenti állítás továbbra is igaz marad. </p>
                                    <p>Példa:</p>
                                    <p>Két állomásunk van, mindkettőnek két neve van, "A, B" és "C, D". </p>
                                    <p>A generált távolságok: </p>

                                    <img src="/example-table.png" alt="Példatáblázat"/>

                                    <h3 className="font-semibold text-lg pt-2">Egyéb apróságok</h3>
                                    <ul className="list-disc list-inside space-y-2 pl-4">
                                        <li>
                                            <strong>Térképek mentése:</strong> A létrehozott térképeket el lehet menteni, hogy azok pl. a jövő évi versenyszezonban is könnyen megtalálhatóak legyenek. A mentett térképek az adott Google-fiókból lesznek csak elérhetőek.
                                        </li>
                                        <li>
                                            <strong>Térképtűk mozgatása:</strong> A lerakott térképtűket meg lehet fogni és áthúzni egy másik helyre, ha úgy van kedvünk.
                                        </li>
                                        <li>
                                            <strong>Elvesztél?</strong> Nyomj rá bármelyik állomás nevére, hogy a térkép odaugorjon.
                                        </li>
                                    </ul>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-6 border-t border-gray-200 text-right">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-500 transition duration-150"
                                    >
                                        Rendben
                                    </button>
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
