import { useState } from 'react'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../context/useAuth'

const drawerWidth = 260

const links: { to: string; prefix: string; label: string }[] = [
  { to: '/jobs/today', prefix: '/jobs', label: 'פניות' },
  { to: '/accounts/businesses', prefix: '/accounts', label: 'ספקים' },
  { to: '/leads', prefix: '/leads', label: 'לידים' },
  { to: '/tickets', prefix: '/tickets', label: 'שירות לקוחות' },
  { to: '/tasks/my-tasks', prefix: '/tasks', label: 'משימות' },
  { to: '/cities', prefix: '/cities', label: 'אזורים וערים' },
  { to: '/commissions', prefix: '/commissions', label: 'מחירון עמלות' },
]

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const drawer = (
    <Box sx={{ textAlign: 'right', direction: 'rtl' }}>
      <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
        <Box
          component="img"
          src="/perfecto-logo.svg"
          alt="Perfecto"
          sx={{ width: 72, height: 72, borderRadius: '50%' }}
        />
      </Toolbar>
      <Divider />
      <List>
        {links.map((l) => {
          const selected =
            location.pathname === l.prefix || location.pathname.startsWith(`${l.prefix}/`)
          return (
            <ListItemButton
              key={l.prefix}
              component={RouterLink}
              to={l.to}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              sx={{
                ...(selected
                  ? {
                    bgcolor: 'rgba(0,0,0,0.06)',
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                  }
                  : {}),
              }}
            >
              <ListItemText
                primary={l.label}
                slotProps={{ primary: { sx: { fontWeight: 600, textAlign: 'right' } } }}
              />
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          bgcolor: '#111',
          color: '#FFDD00',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mr: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
            aria-label="תפריט"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Perfecto - שירות לקוחות
          </Typography>
          <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user?.fullName}
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            aria-label="התנתקות"
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          anchor="right"
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          anchor="right"
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: '#fafafa',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
