declare var cv: any;

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Component, ElementRef, ViewChild } from '@angular/core';

import { BookService } from '../../services/book.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import Tesseract from 'tesseract.js';

@Component({
  selector: 'app-add-book',
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './add-book.component.html',
  styleUrl: './add-book.component.scss'
})
export class AddBookComponent {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef;

  title = '';
  author = '';
  number = '';
  
  coverImage: string | null = null;

  stream!: MediaStream;
  
  isProcessing: boolean = false;

  constructor(private bookService: BookService, private router: Router) {}

  ngAfterViewInit() {
    this.startCamera();
  }
  
  /** 📌 Start Camera Stream */
  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  }

  /** 📌 Capture Image and Process with OpenCV */
  captureAndProcess() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d')!;

    if(!ctx) return;

    // Draw the video frame on the canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.coverImage = canvas.toDataURL('image/png');

    this.process(canvas);
  }

  /** Process by openCV */
  private process(canvas: any) {
    this.isProcessing = true;

    // Convert to OpenCV Mat
    let src = cv.imread(canvas);
    let dst = new cv.Mat();

    if (typeof cv === 'undefined') {}
    else {
    // Preprocessing: Convert to Grayscale
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);

      // Apply Adaptive Thresholding (Enhances Text Visibility)
      cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

      // Display processed image on canvas
      cv.imshow(canvas, dst);
    }
    // Convert back to data URL and send to OCR
    this.extractText(canvas.toDataURL());

    // Free memory
    src.delete();
    dst.delete();
  }

  async takePhoto() {
    const image = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri,
      quality: 90
    });

    if (image.webPath) {
      this.coverImage = image.webPath;
    }
  }

  addBook() {
    if (this.title && this.author) {
      this.bookService.insertBook({ id: Date.now(), title: this.title, author: this.author });
      this.router.navigate(['/']);
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async extractText(imageData: string) {
    // via regex
    // if (!this.coverImage) return;

    // const { data } = await Tesseract.recognize(this.coverImage, 'eng');
    // console.log('Testo estratto:', data.text);

    // // Prova a identificare titolo, autore e ISBN con regex
    // const titleMatch = data.text.match(/(?:Title:|TITOLO:)\s*(.*)/i);
    // const authorMatch = data.text.match(/(?:Author:|AUTORE:)\s*(.*)/i);
    // const isbnMatch = data.text.match(/(?:ISBN[:\s]*)(\d{10,13})/i);

    // const title = titleMatch ? titleMatch[1] : 'Sconosciuto';
    // const author = authorMatch ? authorMatch[1] : 'Sconosciuto';
    // const isbn = isbnMatch ? isbnMatch[1] : 'N/A';

    // console.log(`📖 Titolo: ${title}, ✍️ Autore: ${author}, 🔢 ISBN: ${isbn}`);
    
    // via zone
    // if (!this.coverImage) return;

    // const { data } = await Tesseract.recognize(this.coverImage, 'eng');

    // Esempio: Estrarre Solo il Testo della Parte Alta dell’Immagine
    // const { data } = await Tesseract.recognize(this.coverImage, 'eng', {
    //   rectangle: { left: 50, top: 50, width: 500, height: 200 } // Solo la parte alta
    // });

    // Dividi il testo in righe
    // const lines = data.text.split('\n').map(line => line.trim()).filter(line => line);

    // if (lines.length < 2) {
    //   console.log('Testo non riconosciuto correttamente!');
    //   return;
    // }

    // const title = lines[0]; // Prima riga → Titolo
    // const author = lines[1]; // Seconda riga → Autore
    // const isbn = lines.length > 2 ? lines[2].match(/\d{10,13}/)?.[0] || 'N/A' : 'N/A';

    // console.log(`📖 Titolo: ${title}, ✍️ Autore: ${author}, 🔢 ISBN: ${isbn}`);

    Tesseract.recognize(imageData, 'eng', {
      logger: m => console.log(m)
    }).then(({ data: { text } }) => {
      console.log('OCR Result:', text);

      // Basic Parsing: Extract Title, Author, Number
      this.parseBookDetails(text);
      this.isProcessing = false;
    }).catch(err => {
      console.error('OCR Error:', err);
      this.isProcessing = false;
    });
  }

   /** 📌 Parse Extracted Text (Basic Heuristic Matching) */
   parseBookDetails(text: string) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 0) this.title = lines[0]; // First line as Title
    if (lines.length > 1) this.author = lines[1]; // Second line as Author
    if (lines.length > 2) this.number = lines.find(line => /\d+/.test(line)) || ''; // Find Number
  }
}
