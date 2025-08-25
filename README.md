# 🚆 betterbahn - Find Your Perfect Train Journey

[![Download BetterBahn](https://img.shields.io/badge/Download_BetterBahn-latest-brightgreen)](https://github.com/vaibhu1357/betterbahn/releases)

BetterBahn is a web app for finding the best train journeys in Germany. This tool helps you navigate the rail system efficiently, focusing on cost-effective travel options. While split ticketing can help save money, it is not the primary method for booking. The app will continue to evolve with more features in the future.

## 🌐 Technology

BetterBahn leverages the [db-vendo-client](https://github.com/public-transport/db-vendo-client) to access Deutsche Bahn ticketing data. This allows you to get real-time information on train schedules and ticket options. This client is licensed under the ISC License, ensuring a wide range of use.

## ⚖️ Legal Notice

This project is not an official repository or project of Deutsche Bahn AG. It operates as an independent tool and is not affiliated with or endorsed by Deutsche Bahn. To utilize this code or the db-vendo-client, you must obtain permission from Deutsche Bahn AG.

## 🚀 Getting Started

To start using BetterBahn, follow these simple steps to run the application on your computer.

1. **Clone the repository**  
   Click on the green "Code" button above and copy the URL. Open your terminal and type:

   ```
   git clone [repository URL]
   ```

2. **Install dependencies**  
   Navigate into the cloned directory and run the following command to install all necessary files:

   ```
   npm install
   ```

3. **Start the development server**  
   Run this command to launch BetterBahn on your local machine:

   ```
   npm run dev
   ```

These commands get you up and running quickly, letting you access BetterBahn right from your browser.

## 🐳 Docker

BetterBahn can also run as a Docker container. This option is useful if you want to keep your local environment clean. The repository includes a `Dockerfile`, allowing you to build and run the application efficiently.

### Steps to Run with Docker

1. **Ensure Docker is installed**  
   Make sure you have Docker installed on your system. If you haven't, you can download it from the [Docker website](https://www.docker.com/products/docker-desktop).

2. **Build the Docker image**  
   Navigate to the BetterBahn directory in your terminal and run:

   ```
   docker build -t betterbahn .
   ```

3. **Run the Docker container**  
   Start the application with the following command:

   ```
   docker run -p 3000:3000 betterbahn
   ```

You can access the application in your web browser at `http://localhost:3000`.

## 📥 Download & Install

For those who prefer to avoid technical setup, you can easily download BetterBahn from the Releases page. Click the button below to access the latest version:

[![Download BetterBahn](https://img.shields.io/badge/Download_BetterBahn-latest-brightgreen)](https://github.com/vaibhu1357/betterbahn/releases)

Simply follow these steps:

1. **Visit the Releases page**  
   Click the link or button above to go to the [GitHub Releases page](https://github.com/vaibhu1357/betterbahn/releases).

2. **Select the latest release**  
   Look for the latest version of BetterBahn available.

3. **Download the file**  
   Choose the appropriate file for your operating system (e.g., `.exe` for Windows, `.dmg` for macOS) and click to download it.

4. **Run the Installed Application**  
   After the download completes, find the file in your downloads folder. Double-click it to install and follow the prompts to complete the setup.

5. **Launch BetterBahn**  
   Once installed, you can find BetterBahn in your applications list. Open it to start planning your trips.

## 📖 Features

- **Easy Journey Planning**  
  Quickly find the best train options based on your starting point and destination.

- **Cost-Effective Options**  
  Explore split ticketing options to save money on your journey. 

- **User-Friendly Interface**  
  Navigate through the app features without hassle.

- **Real-Time Data**  
  Access updated schedules and fare information through the db-vendo-client.

## 🛡️ License

BetterBahn is licensed under the Creative Commons license. For details about the license, you can check the license file in the repository.

## 💬 Support

If you encounter any issues or have questions, feel free to open an issue on the GitHub page or reach out to the community. We continually work to improve BetterBahn and welcome your feedback.