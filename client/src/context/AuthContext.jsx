import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {api,setAccessToken} from '../api/client';
const AuthContext=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{const boot=async()=>{try{let profile;try{profile=await api.get('/auth/profile')}catch{const refreshed=await api.post('/auth/refresh-token');setAccessToken(refreshed.data.data.accessToken);profile=await api.get('/auth/profile')}setUser(profile.data.data);}catch{}finally{setLoading(false);}};boot();const expired=()=>{setUser(null);setAccessToken(null)};addEventListener('auth:expired',expired);return()=>removeEventListener('auth:expired',expired)},[]);
  const value=useMemo(()=>({user,loading,login:async values=>{const {data}=await api.post('/auth/login',values);setAccessToken(data.data.accessToken);setUser(data.data.user);return data.data.user;},logout:async()=>{try{await api.post('/auth/logout')}finally{setAccessToken(null);setUser(null)}},hasRole:(...roles)=>roles.includes(user?.role?.name)}),[user,loading]);return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);
