import { useState } from 'react'
import MainMenu from './components/MainMenu'
import OddEvenGame from './components/OddEvenGame'
import SnailRacing from './components/SnailRacing'
import AdminPanel from './components/AdminPanel'

export default function App() {
  const [screen, setScreen] = useState('menu')

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      {screen === 'menu' && <MainMenu onSelect={setScreen} />}
      {screen === 'oddeven' && <OddEvenGame onBack={() => setScreen('menu')} />}
      {screen === 'snail' && <SnailRacing onBack={() => setScreen('menu')} />}
      {screen === 'admin' && <AdminPanel onBack={() => setScreen('menu')} />}
    </div>
  )
}
