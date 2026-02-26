import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import RegistrationModal from '../Registration/RegistrationModal'

export default function Layout() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="layout">
      <Sidebar onRegisterClick={() => setModalOpen(true)} />
      <main className="main-content">
        <Outlet />
      </main>
      <RegistrationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
