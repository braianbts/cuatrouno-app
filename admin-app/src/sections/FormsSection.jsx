import { useState } from 'react';
import { Box, Button, Card, Chip, Collapse, Stack, Typography } from '@mui/material';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useData } from '../data';
import { useUI } from '../App';
import { Empty } from '../components';
import { BRAND } from '../theme';

const FORM_FIELD_LABELS = {
  edad: 'Edad', telefono: 'WhatsApp', email: 'Email', altura: 'Altura', peso: 'Peso',
  lesiones: 'Lesiones/condiciones', cirugias: 'Cirugías/intervenciones', medicacion: 'Medicación', habitos: 'Hábitos',
  suplementacion: 'Suplementación', comidas_por_dia: 'Comidas/día', alergias: 'Alergias',
  preferencias_comida: 'Preferencias/no come', dieta_actual: 'Dieta actual', notas_alimentacion: 'Algo más que deba saber',
  objetivo: 'Objetivo', experiencia: 'Experiencia', dias_disponibles: 'Días disponibles', lugar_entrenamiento: 'Lugar',
};

// "Juan Ignacio Pérez" -> "juan-ignacio" (sugerencia de usuario al crear el alumno desde la ficha).
const suggestUsername = (name) => String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/\s+/).filter(Boolean).slice(0, 2).join('-').replace(/[^a-z0-9-]/g, '');

export default function FormsSection() {
  const { forms, students, errors } = useData();
  const ui = useUI();
  const [open, setOpen] = useState(null);
  const q = ui.search.trim().toLowerCase();
  const list = forms.filter((f) => !q || String(f.nombre || '').toLowerCase().includes(q));
  const isStudent = (f) => students.some((s) => s.full_name.trim().toLowerCase() === String(f.nombre || '').trim().toLowerCase());

  if (errors.forms) return <Card sx={{ p: 2 }}><Empty>Error cargando formularios.</Empty></Card>;
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }, alignItems: 'start' }}>
      {!list.length && <Card sx={{ p: 2 }}><Empty>Todavía no hay fichas.</Empty></Card>}
      {list.map((f) => {
        const fields = Object.entries(FORM_FIELD_LABELS).filter(([k]) => f[k]);
        const fid = f.id ?? f.recibido_en;
        const expanded = open === fid;
        const already = isStudent(f);
        return (
          <Card key={fid} sx={{ p: 2 }}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{f.nombre || '(sin nombre)'}</Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{new Date(f.recibido_en).toLocaleString('es-AR')}</Typography>
              </Box>
              {already ? <Chip size="small" label="Ya es alumno" color="success" variant="outlined" /> : (
                <Button size="small" variant="outlined" startIcon={<PersonAddAlt1RoundedIcon />} onClick={() => ui.newStudent({ full_name: f.nombre || '', username: suggestUsername(f.nombre) })}>Crear alumno</Button>
              )}
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: 'wrap', rowGap: 0.75 }}>
              {f.objetivo && <Chip size="small" label={f.objetivo} sx={{ bgcolor: 'rgba(200,30,30,.08)', color: 'primary.main', maxWidth: '100%' }} />}
              {f.experiencia && <Chip size="small" label={f.experiencia} sx={{ maxWidth: '100%' }} />}
              {f.dias_disponibles && <Chip size="small" label={f.dias_disponibles + ' días'} />}
            </Stack>
            <Collapse in={expanded}>
              <Box sx={{ mt: 1.5, display: 'grid', gap: 0.75 }}>
                {fields.map(([k, label]) => (
                  <Box key={k} sx={{ fontSize: 12.5, borderTop: `1px solid ${BRAND.line}`, pt: 0.75 }}>
                    <Typography component="span" sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary' }}>{label}: </Typography>
                    <Typography component="span" sx={{ fontSize: 12.5 }}>{String(f[k])}</Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
            <Button size="small" onClick={() => setOpen(expanded ? null : fid)} endIcon={<ExpandMoreRoundedIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '.2s' }} />} sx={{ mt: 1, px: 1 }}>
              {expanded ? 'Ocultar ficha' : `Ver ficha (${fields.length} datos)`}
            </Button>
          </Card>
        );
      })}
    </Box>
  );
}
