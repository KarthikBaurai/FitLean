import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import About from './pages/About';
import Trainers from './pages/Trainers';
import TrainerProfile from './pages/TrainerProfile';
import Memberships from './pages/Memberships';
import Locations from './pages/Locations';
import LocationDetail from './pages/LocationDetail';
import Contact from './pages/Contact';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Book from './pages/Book';
import MyAppointments from './pages/MyAppointments';
import AppointmentDetail from './pages/AppointmentDetail';
import NotFound from './pages/NotFound';

import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminAppointments from './pages/admin/Appointments';
import AdminTrainers from './pages/admin/Trainers';
import TrainerForm from './pages/admin/TrainerForm';
import Members from './pages/admin/Members';
import Enquiries from './pages/admin/Enquiries';

export default function App() {
  return (
    <Routes>
      {/* Public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/trainers" element={<Trainers />} />
        <Route path="/trainers/:slug" element={<TrainerProfile />} />
        <Route path="/memberships" element={<Memberships />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/locations/:slug" element={<LocationDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/book" element={<Book />} />

        {/* Member area (login required) */}
        <Route path="/account" element={<ProtectedRoute><MyAppointments /></ProtectedRoute>} />
        <Route path="/account/appointments/:id" element={<ProtectedRoute><AppointmentDetail /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Login pages (no navbar) */}
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />

      {/* Admin portal (admin role required) */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="appointments/:id" element={<AppointmentDetail admin />} />
        <Route path="trainers" element={<AdminTrainers />} />
        <Route path="trainers/new" element={<TrainerForm />} />
        <Route path="trainers/:id/edit" element={<TrainerForm />} />
        <Route path="members" element={<Members />} />
        <Route path="enquiries" element={<Enquiries />} />
      </Route>
    </Routes>
  );
}
