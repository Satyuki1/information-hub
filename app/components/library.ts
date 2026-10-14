"use client";
import {useEffect,useState} from 'react';
import {requestJSON} from './session';
import {TOPICS} from '../../lib/content';
import type {Library} from '../../lib/library';
export function useLibrary(){const[data,setData]=useState<Library>({topics:TOPICS.map((name,i)=>({id:`topic-${i}`,name})),groups:[],revision:''});useEffect(()=>{requestJSON('/api/library').then(setData).catch(()=>{});},[]);return data;}
