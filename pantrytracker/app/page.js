'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Box, Stack, Typography, Button, Modal, TextField, IconButton } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { firestore } from '../firebase' // Ensure this path is correct
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import MicIcon from '@mui/icons-material/Mic'
import { differenceInDays } from 'date-fns'
import nlp from 'compromise'

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'white',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  alignItems: 'center',
}

export default function Home() {
  const [inventory, setInventory] = useState([])
  const [open, setOpen] = useState(false)
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expirationDate, setExpirationDate] = useState(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    updateInventory()
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim()
            console.log(`Transcript: ${transcript}`)
            handleVoiceCommand(transcript)
          }
        }
      }
      recognitionRef.current = recognition
    } else {
      alert('Your browser does not support the Web Speech API')
    }
  }, [])

  const handleVoiceCommand = (transcript) => {
    const doc = nlp(transcript)
    const command = doc.verbs().out('array')[0]
    const item = doc.nouns().out('array')[0]
    const qty = doc.values().toNumber().out('array')[0] || 1

    console.log(`Command: ${command}, Item: ${item}, Quantity: ${qty}`)

    if (command === 'add' && item) {
      addItemVoice(item, qty)
    } else if (command === 'remove' && item) {
      removeItem(item)
    } else if (command === 'check' && item) {
      checkItem(item)
    } else {
      setFeedbackMessage('Command not recognized. Please try again.')
    }
  }

  const addItemVoice = async (item, qty) => {
    const docRef = doc(collection(firestore, 'inventory'), item)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const { quantity: existingQuantity } = docSnap.data()
      await setDoc(docRef, { quantity: existingQuantity + qty })
    } else {
      await setDoc(docRef, { quantity: qty })
    }
    await updateInventory()
    setFeedbackMessage(`Added ${qty} ${item}(s) to the pantry.`)
  }

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, 'inventory'))
    const docs = await getDocs(snapshot)
    const inventoryList = []
    docs.forEach((doc) => {
      inventoryList.push({ name: doc.id, ...doc.data() })
    })
    setInventory(inventoryList)
  }

  const addItem = async () => {
    const docRef = doc(collection(firestore, 'inventory'), itemName)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const { quantity: existingQuantity } = docSnap.data()
      await setDoc(docRef, { quantity: existingQuantity + parseInt(quantity, 10), expirationDate })
    } else {
      await setDoc(docRef, { quantity: parseInt(quantity, 10), expirationDate })
    }
    await updateInventory()
    setItemName('')
    setQuantity('')
    setExpirationDate(null)
    handleClose()
    setFeedbackMessage(`Added ${quantity} ${itemName}(s) to the pantry.`)
  }

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item)
    await deleteDoc(docRef)
    await updateInventory()
    setFeedbackMessage(`Removed ${item} from the pantry.`)
  }

  const checkItem = (item) => {
    const foundItem = inventory.find((i) => i.name.toLowerCase() === item.toLowerCase())
    if (foundItem) {
      setFeedbackMessage(`${item} is in the pantry with a quantity of ${foundItem.quantity}.`)
    } else {
      setFeedbackMessage(`${item} is not in the pantry.`)
    }
  }

  const incrementItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const { quantity } = docSnap.data()
      await setDoc(docRef, { quantity: quantity + 1 })
      await updateInventory()
    }
  }

  const decrementItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const { quantity } = docSnap.data()
      if (quantity > 1) {
        await setDoc(docRef, { quantity: quantity - 1 })
      } else {
        await deleteDoc(docRef)
      }
      await updateInventory()
    }
  }

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start()
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        width="100vw"
        height="100vh"
        display={'flex'}
        justifyContent={'center'}
        flexDirection={'column'}
        alignItems={'center'}
        gap={2}
        style={{
          backgroundImage: 'url(image/pantry3.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Typography
          variant="h1"
          style={{ color: '#fdfdfd', fontFamily: 'Segoe Script', textAlign: 'center' }}
          textAlign={'center'}
        >
          My Pantry Tracker
        </Typography>

        <Modal
          open={open}
          onClose={handleClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={style}>
            <Typography 
              id="modal-modal-title" 
              variant="h6" 
              component="h2"
              style={{
                color: '#3c5649',
                fontFamily: 'The Seasons',
                textAlign: 'center',
                marginBottom: '1rem'
              }}
            >
              Add Item
            </Typography>
            <Stack width="100%" spacing={2}>
              <TextField
                id="outlined-basic"
                label="Item"
                variant="outlined"
                fullWidth
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
              <TextField
                label="Quantity"
                variant="outlined"
                fullWidth
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
              />
              <DatePicker
                label="Expiration Date"
                value={expirationDate}
                onChange={(newValue) => setExpirationDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth variant="outlined" />}
              />
            </Stack>
            <Button
              variant="outlined"
              onClick={addItem}
              style={{ marginTop: '1rem' }}
            >
              Add
            </Button>
          </Box>
        </Modal>
        
        <Button
          variant="contained"
          onClick={handleOpen}
          sx={{
            color: '#fbfbfb',
            fontFamily: 'Abril Fatface',
            backgroundColor: '#3f6953',
            '&:hover': {
              backgroundColor: '#76a886'
            }
          }}
        >
          Add New Item
        </Button>

        <IconButton 
          onClick={startListening}
          sx={{
            color: '#fbfbfb',
            fontFamily: 'Abril Fatface',
            backgroundColor: '#3f6953',
            '&:hover': {
              backgroundColor: '#76a886'
            }
          }}
        >
          <MicIcon />
        </IconButton>

        <Stack width="800px" height="300px" spacing={2} overflow={'auto'}>
          {inventory.map(({ name, quantity, expirationDate }) => {
            const daysUntilExpiration = expirationDate ? differenceInDays(new Date(expirationDate.seconds * 1000), new Date()) : null;
            const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 7;

            return (
              <Box
                key={name}
                width="100%"
                minHeight="70px"
                display={'flex'}
                justifyContent={'space-between'}
                alignItems={'center'}
                bgcolor={'#f0f0f0'}
                paddingX={5}
                borderRadius={10}
              >
                <Box display="flex" flexDirection="column">
                  <Typography variant={'h5'} color={'#333'} textAlign={'center'}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </Typography>
                  {isExpiringSoon && (
                    <Typography variant="subtitle1" color="error" style={{ fontWeight: 'bold' }}>
                      Expires soon!
                    </Typography>
                  )}
                  {quantity === 1 && (
                    <Typography variant="subtitle1" color="error" style={{ fontWeight: 'bold' }}>
                      Restock!
                    </Typography>
                  )}
                </Box>
                <Box display="flex" alignItems="center" ml="auto">
                  <IconButton onClick={() => decrementItem(name)}>
                    <RemoveIcon />
                  </IconButton>
                  <Typography variant={'h5'} color={'#333'} textAlign={'center'} style={{ margin: '0 10px' }}>
                    {quantity}
                  </Typography>
                  <IconButton onClick={() => incrementItem(name)}>
                    <AddIcon />
                  </IconButton>
                  <Button 
                    variant="contained" 
                    onClick={() => removeItem(name)}
                    sx={{
                      marginLeft: '8px',
                      color: '#fbfbfb',
                      fontFamily: 'Abril Fatface',
                      backgroundColor: '#80150e',
                      '&:hover': {
                        backgroundColor: '#da3328'
                      }
                    }}
                  >
                    Remove
                  </Button>
                </Box>
              </Box>
            )
          })}
        </Stack>

        {feedbackMessage && (
          <Typography
            variant="subtitle1"
            style={{
              position: 'fixed',
              bottom: '10px',
              textAlign: 'center',
              background: '#f0f0f0',
              padding: '10px',
              borderRadius: '5px',
              color: '#333',
              fontFamily: 'Abril Fatface'
            }}
          >
            {feedbackMessage}
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  )
}

