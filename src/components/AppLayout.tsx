import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useAuth } from '../context/useAuth'
import { getConversations } from '../api/csApi'
import { CSS_VAR_APP_BAR_HEIGHT_PX, MAIN_PADDING_TOP_CSS } from '../layout/headerLayout'
import { isManagerRole } from '../lib/roles'

const drawerWidth = 260

type NavChild = { to: string; label: string }
type NavLink = { to: string; prefix: string; label: string; children?: NavChild[] }

const FLYOUT_LEAVE_CLOSE_MS = 180

function pathMatches(pathname: string, to: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  const target = to.split('?')[0].replace(/\/+$/, '') || '/'
  return path === target
}

const mainLinks: NavLink[] = [
  { to: '/personal-area', prefix: '/personal-area', label: 'אזור אישי' },
  { to: '/jobs/today', prefix: '/jobs', label: 'פניות מלקוחות' },
  { to: '/accounts/businesses', prefix: '/accounts', label: 'ספקים' },
  { to: '/leads', prefix: '/leads', label: 'לידים' },
  { to: '/payment-attempts', prefix: '/payment-attempts', label: 'תשלומים' },
  { to: '/tickets', prefix: '/tickets', label: 'שירות ספקים' },
  { to: '/tasks/my-tasks', prefix: '/tasks', label: 'משימות' },
  { to: '/cities', prefix: '/cities', label: 'ספקים וערים' },
  { to: '/commissions', prefix: '/commissions', label: 'מחירון עמלות' },
  { to: '/company-employees', prefix: '/company-employees', label: 'עובדי חברה' },
  { to: '/domains', prefix: '/domains', label: 'דומיינים' },
  { to: '/notifications', prefix: '/notifications', label: 'התראות' },
  { to: '/conversations?tab=open', prefix: '/conversations', label: 'שיחות' },
  { to: '/complaints', prefix: '/complaints', label: 'תלונות' },
  { to: '/expenses', prefix: '/expenses', label: 'הוצאות' },
  {
    to: '/general/scheduled-lead-calls',
    prefix: '/general',
    label: 'כללי',
    children: [
      { to: '/general/scheduled-lead-calls', label: 'שיחות מתוזמנות ללידים' },
      { to: '/general/blacklist', label: 'רשימה שחורה' },
      { to: '/general/blacklist-attempts', label: 'ניסיונות שנחסמו' },
      { to: '/general/membership-fee', label: 'דמי הקמה' },
    ],
  },
]

const bottomLinks: NavLink[] = [
  { to: '/dashboards/leads', prefix: '/dashboards', label: 'דשבורדים' },
]

const MANAGER_ONLY_PREFIXES = new Set([
  '/jobs',
  '/tasks',
  '/company-employees',
  '/domains',
  '/dashboards',
  '/notifications',
  '/expenses',
])

function filterNavLinks(links: NavLink[], isManager: boolean): NavLink[] {
  if (isManager) return links
  return links.filter((l) => !MANAGER_ONLY_PREFIXES.has(l.prefix))
}

const allLinks = [...mainLinks, ...bottomLinks]

function pageTitleForPath(pathname: string, links: NavLink[] = allLinks): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  const hit = links.find((l) => path === l.prefix || path.startsWith(`${l.prefix}/`))
  return hit?.label ?? 'פרפקטו'
}

const selectedNavSx = {
  bgcolor: 'rgba(0,0,0,0.06)',
  borderLeft: '4px solid',
  borderColor: 'primary.main',
} as const

function NavAggregateItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavLink
  pathname: string
  onNavigate: () => void
}) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true })
  const children = item.children ?? []
  const groupSelected = pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)
  const [open, setOpen] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const anchorRef = useRef<HTMLDivElement | null>(null)

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const openMenu = () => {
    clearCloseTimer()
    setOpen(true)
  }

  const closeMenuSoon = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      setOpen(false)
    }, FLYOUT_LEAVE_CLOSE_MS)
  }

  useEffect(() => () => clearCloseTimer(), [])

  useEffect(() => {
    if (!isDesktop && groupSelected) setOpen(true)
  }, [isDesktop, groupSelected])

  const childButtonSx = (selected: boolean) => ({
    ...(selected ? { bgcolor: 'rgba(0,0,0,0.06)' } : {}),
    '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
  })

  const childrenList = (
    <List disablePadding dense>
      {children.map((child) => {
        const selected = pathMatches(pathname, child.to)
        return (
          <ListItemButton
            key={child.to}
            component={RouterLink}
            to={child.to}
            selected={selected}
            onClick={() => {
              setOpen(false)
              onNavigate()
            }}
            sx={childButtonSx(selected)}
          >
            <ListItemText
              primary={child.label}
              slotProps={{ primary: { sx: { fontWeight: 600, textAlign: 'right', width: '100%', fontSize: 14 } } }}
              sx={{ width: '100%', m: 0 }}
            />
          </ListItemButton>
        )
      })}
    </List>
  )

  if (!isDesktop) {
    return (
      <Box>
        <ListItemButton
          selected={groupSelected}
          onClick={() => setOpen((v) => !v)}
          sx={groupSelected ? selectedNavSx : undefined}
        >
          <ListItemText
            primary={item.label}
            slotProps={{ primary: { sx: { fontWeight: 600, textAlign: 'right', width: '100%' } } }}
            sx={{ width: '100%', m: 0 }}
          />
          <ExpandMoreIcon
            sx={{
              fontSize: 20,
              color: 'text.secondary',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: theme.transitions.create('transform', {
                duration: theme.transitions.duration.shorter,
              }),
            }}
          />
        </ListItemButton>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box sx={{ pr: 1.5 }}>{childrenList}</Box>
        </Collapse>
      </Box>
    )
  }

  return (
    <Box ref={anchorRef} onMouseEnter={openMenu} onMouseLeave={closeMenuSoon}>
      <ListItemButton
        selected={groupSelected}
        component={RouterLink}
        to={item.to}
        onClick={onNavigate}
        sx={groupSelected ? selectedNavSx : undefined}
      >
        <ListItemText
          primary={item.label}
          slotProps={{ primary: { sx: { fontWeight: 600, textAlign: 'right', width: '100%' } } }}
          sx={{ width: '100%', m: 0 }}
        />
        <ChevronLeftIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
      </ListItemButton>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="left-start"
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'preventOverflow', options: { padding: 8 } },
        ]}
        sx={{ zIndex: (t) => t.zIndex.modal + 2 }}
      >
        <Paper
          elevation={8}
          onMouseEnter={openMenu}
          onMouseLeave={closeMenuSoon}
          sx={{
            minWidth: 220,
            py: 0.5,
            direction: 'rtl',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
          }}
        >
          {childrenList}
        </Paper>
      </Popper>
    </Box>
  )
}

function NavList({
  items,
  pathname,
  onNavigate,
  openConversationsCount = 0,
}: {
  items: NavLink[]
  pathname: string
  onNavigate: () => void
  openConversationsCount?: number
}) {
  return (
    <List disablePadding>
      {items.map((l) => {
        if (l.children?.length) {
          return (
            <NavAggregateItem
              key={l.prefix}
              item={l}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          )
        }
        const selected = pathname === l.prefix || pathname.startsWith(`${l.prefix}/`)
        const showOpenCount = l.prefix === '/conversations' && openConversationsCount > 0
        return (
          <ListItemButton
            key={l.prefix}
            component={RouterLink}
            to={l.to}
            selected={selected}
            onClick={onNavigate}
            sx={selected ? selectedNavSx : undefined}
          >
            <ListItemText
              primary={
                showOpenCount ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      gap: 1,
                    }}
                  >
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {l.label}
                    </Box>
                    <Box component="span" sx={{ color: 'error.main', fontWeight: 800, flexShrink: 0 }}>
                      {openConversationsCount}
                    </Box>
                  </Box>
                ) : (
                  l.label
                )
              }
              slotProps={{ primary: { sx: { fontWeight: 600, textAlign: 'right', width: '100%' } } }}
              sx={{ width: '100%', m: 0 }}
            />
          </ListItemButton>
        )
      })}
    </List>
  )
}

export default function AppLayout() {
  const appBarRef = useRef<HTMLDivElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openConversationsCount, setOpenConversationsCount] = useState(0)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!user) {
      setOpenConversationsCount(0)
      return
    }

    let cancelled = false

    const loadOpenCount = async () => {
      try {
        const { items } = await getConversations({ status: 'open' })
        if (!cancelled) setOpenConversationsCount(items?.length ?? 0)
      } catch {
        if (!cancelled) setOpenConversationsCount(0)
      }
    }

    void loadOpenCount()
    const intervalId = setInterval(loadOpenCount, 30_000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [user, location.pathname])

  const isManager = isManagerRole(user?.role)
  const visibleMainLinks = useMemo(() => filterNavLinks(mainLinks, isManager), [isManager])
  const visibleBottomLinks = useMemo(() => filterNavLinks(bottomLinks, isManager), [isManager])
  const visibleAllLinks = useMemo(
    () => [...visibleMainLinks, ...visibleBottomLinks],
    [visibleMainLinks, visibleBottomLinks],
  )

  const pageTitle = useMemo(
    () => pageTitleForPath(location.pathname, visibleAllLinks),
    [location.pathname, visibleAllLinks],
  )

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

  const closeMobileDrawer = () => setMobileOpen(false)

  const drawer = (
    <Box
      sx={{
        textAlign: 'right',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100%',
      }}
    >
      <Toolbar sx={{ justifyContent: 'center', py: 1, flexShrink: 0 }}>
        <Box
          component="img"
          src="/perfecto-logo.svg"
          alt="פרפקטו"
          sx={{ width: 36, height: 36, borderRadius: '50%' }}
        />
      </Toolbar>
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <NavList
          items={visibleMainLinks}
          pathname={location.pathname}
          onNavigate={closeMobileDrawer}
          openConversationsCount={openConversationsCount}
        />
      </Box>
      <Divider />
      <Box sx={{ flexShrink: 0, mt: 'auto' }}>
        <NavList items={visibleBottomLinks} pathname={location.pathname} onNavigate={closeMobileDrawer} />
      </Box>
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
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          anchor="right"
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              display: 'flex',
              flexDirection: 'column',
            },
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
