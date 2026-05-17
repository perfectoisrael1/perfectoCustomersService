import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { CSS_VAR_APP_BAR_HEIGHT_PX, MAIN_PADDING_TOP_CSS } from '../layout/headerLayout'

const drawerWidth = 260

const links: { to: string; prefix: string; label: string }[] = [
  { to: '/jobs/today', prefix: '/jobs', label: 'פניות' },
  { to: '/accounts/businesses', prefix: '/accounts', label: 'ספקים' },
  { to: '/leads', prefix: '/leads', label: 'לידים' },
  { to: '/tickets', prefix: '/tickets', label: 'שירות לקוחות' },
  { to: '/tasks/my-tasks', prefix: '/tasks', label: 'משימות' },
  { to: '/cities', prefix: '/cities', label: 'אזורים וערים' },
  { to: '/commissions', prefix: '/commissions', label: 'מחירון עמלות' },
  { to: '/company-employees', prefix: '/company-employees', label: 'עובדי חברה' },
]

function pageTitleForPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  const hit = links.find((l) => path === l.prefix || path.startsWith(`${l.prefix}/`))
  return hit?.label ?? 'פרפקטו'
}

export default function AppLayout() {
  const appBarRef = useRef<HTMLDivElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const pageTitle = useMemo(() => pageTitleForPath(location.pathname), [location.pathname])

  useLayoutEffect(() => {
    const el = appBarRef.current
    if (!el || typeof document === 'undefined') return

    const publish = () => {
      // getBoundingClientRect().bottom — מרחק מעליון ה־viewport לתחתית ההדר (מדויק כמו ביקירוס ל־main קבוע)
      const h = el.getBoundingClientRect().bottom
      document.documentElement.style.setProperty(
        CSS_VAR_APP_BAR_HEIGHT_PX,
        `${Number.isFinite(h) ? Math.round(h * 10) / 10 : el.offsetHeight}px`,
      )
    }
    publish()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null
    ro?.observe(el)

    return () => {
      ro?.disconnect()
      document.documentElement.style.removeProperty(CSS_VAR_APP_BAR_HEIGHT_PX)
    }
  }, [])

  const drawer = (
    <Box sx={{ textAlign: 'right', direction: 'rtl' }}>
      <Toolbar sx={{ justifyContent: 'center', py: 1 }}>
        <Box
          component="img"
          src="/perfecto-logo.svg"
          alt="פרפקטו"
          sx={{ width: 36, height: 36, borderRadius: '50%' }}
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
        ref={appBarRef}
        position="fixed"
        elevation={1}
        sx={{
          bgcolor: '#111',
          color: '#FFDD00',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mr: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar
          sx={{
            gap: 0.5,
            boxSizing: 'border-box',
            alignItems: 'center',
            minHeight: '36px !important',
            py: 0,
            px: 1,
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <Box sx={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
            <IconButton
              color="inherit"
              edge="start"
              size="small"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' }, p: 0.35 }}
              aria-label="תפריט"
            >
              <MenuIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Typography
            component="div"
            variant="subtitle1"
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              fontWeight: 800,
              fontSize: { xs: '0.9375rem', sm: '1.0625rem' },
              lineHeight: 1.25,
              textAlign: 'center',
              pointerEvents: 'none',
              mx: 'auto',
              px: { xs: 4, md: 1.5 },
              maxWidth: 'min(560px, 100%)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {pageTitle}
          </Typography>
          <Box sx={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0, fontSize: '0.7rem', fontWeight: 600 }}
            >
              {user?.fullName}
            </Typography>
            <IconButton
              color="inherit"
              size="small"
              sx={{ p: 0.35 }}
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              aria-label="התנתקות"
            >
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
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
          position: 'fixed',
          top: MAIN_PADDING_TOP_CSS,
          left: 0,
          right: { xs: 0, md: `${drawerWidth}px` },
          bottom: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          px: 2,
          pb: 2,
          pt: 0,
          bgcolor: '#fafafa',
          direction: 'rtl',
          zIndex: (theme) => theme.zIndex.appBar - 2,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
