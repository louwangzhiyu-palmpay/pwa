import React, {useEffect} from 'react'
import logo from '../logo.svg'
import '../App.css'
import { Link } from 'react-router-dom'
import Install from './Install'
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const apiUrl = 'https://xxx/webauthn'; //TODO 应用的服务器地址

const bufferToBase64 = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuffer = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

function Home() {
  useEffect(()=>{
    testNetwork()
  },[])

  /**
   * 指纹识别/身份验证-注册流程
   */
  const authRegister = async () => {
    try {
      //调用获取验证配置接口
      const credentialCreationOptions = await (await fetch(`${apiUrl}/registration-options`, {
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })).json();

      credentialCreationOptions.challenge = new Uint8Array(credentialCreationOptions.challenge.data);
      credentialCreationOptions.user.id = new Uint8Array(credentialCreationOptions.user.id.data);
      credentialCreationOptions.user.name = 'pwa@palmpay.test';
      credentialCreationOptions.user.displayName = 'Flexi Cash App';

      //调用验证创建api
      const credential = await navigator.credentials.create({
        publicKey: credentialCreationOptions
      });

      const credentialId = bufferToBase64(credential.rawId);
      //缓存到本地
      localStorage.setItem('credential', JSON.stringify({credentialId}));

      const data = {
        rawId: credentialId,
        response: {
          attestationObject: bufferToBase64(credential.response.attestationObject),
          clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
          id: credential.id,
          type: credential.type
        }
      };

      //调用注册接口
      await (await fetch(`${apiUrl}/register`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({credential: data}),
        credentials: 'include'
      })).json();

      console.log('registration success');
    } catch(e) {
      console.error('registration failed', e);
    } finally {

    }
  };

  /**
   * 指纹识别/身份验证-验证流程
   */
  const authVerify = async () => {
    try {
      //调用获取验证配置接口
      const credentialRequestOptions = await (await fetch(`${apiUrl}/authentication-options`, {
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })).json();

      const {credentialId} = JSON.parse(localStorage.getItem('credential'));

      credentialRequestOptions.challenge = new Uint8Array(credentialRequestOptions.challenge.data);
      credentialRequestOptions.allowCredentials = [
        {
          id: base64ToBuffer(credentialId),
          type: 'public-key',
          transports: ['internal']
        }
      ];

      //调用验证身份api
      const credential = await navigator.credentials.get({
        publicKey: credentialRequestOptions
      });

      const data = {
        rawId: bufferToBase64(credential.rawId),
        response: {
          authenticatorData: bufferToBase64(credential.response.authenticatorData),
          signature: bufferToBase64(credential.response.signature),
          userHandle: bufferToBase64(credential.response.userHandle),
          clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
          id: credential.id,
          type: credential.type
        }
      };

      const response = (await fetch(`${apiUrl}/authenticate`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({credential: data}),
        credentials: 'include'
      }));

      if(response.status === 404) { //身份验证过期
        console.log('Credential has expired');
        //removeCredential(); //移除身份验证，重新创建
      } else {
        const assertionResponse = await response.json();
        console.log('authentication successful');
      }
    } catch(e) {
      console.error('authentication failed', e);
    } finally {
    }
  };

  const testNetwork =()=>{
    if (navigator.onLine){
      console.log('network is online')
    } else {
      console.log('network is online')
    }
    if ('connection' in navigator) {
      const connection = navigator.connection;
      console.log(`网络类型(3g/4g/5g等): ${connection?.effectiveType}`);
      console.log(`网络连接估计下行速度/Mbps: ${connection?.downlink}`);
      console.log(`网络连接最大下行速度/Mbps: ${connection?.downlinkMax}`); //不支持
      console.log(`网络连接的估计往返时间/ms: ${connection?.rtt}`);
      console.log(`是否处于数据节省模式: ${connection?.saveData}`);
    }
  }

  const testUserAgent=()=>{
    const userAgent = navigator.userAgent;
    alert(userAgent);
  }

  /**
   * 浏览器设备指纹, 标识设备唯一id
   */
  const testBrowserFingerPrint=()=>{
    // 初始化 FingerprintJS
    FingerprintJS.load().then(fingerprint => {
      // 获取浏览器指纹
      fingerprint.get().then(result => {
        // result.visitorId 包含生成的唯一指纹
        alert("生成的浏览器指纹:\n"+result.visitorId);
      });
    });
  }

  /**
   * 测试位置信息
   */
  const testGeo=()=>{
    if ("geolocation" in navigator) { //当前浏览器支持地理位置API
      navigator.geolocation.getCurrentPosition(
          function(position) {
            const latitude = position.coords.latitude;  // 纬度
            const longitude = position.coords.longitude; // 经度
            alert(`纬度: ${latitude}, 经度: ${longitude}`);
          },
          function(error) {
            alert("获取位置失败:", error);
          },
          {
            enableHighAccuracy: true, // 可选，是否使用高精度定位
            timeout: 5000,            // 可选，超时时间
            maximumAge: 60*1000       // 可选，缓存时间
          });
    } else {
      alert("geolocation api is not supported");
    }
  }

  /**
   * 测试选取联系人
   * @returns {Promise<void>}
   */
  const testContact=async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      const props = await navigator.contacts.getProperties();
      const contacts = await navigator.contacts.select(props, {multiple: true});
      console.log('testContact >>> success')
    }
  }

  /**
   * 测试获取App列表
   */
  const testGetAppList=()=>{
    if ('getInstalledRelatedApps' in navigator) {
      navigator.getInstalledRelatedApps()
          .then(relatedApps => {
            console.log(relatedApps); // 这里的relatedApps是已安装应用的数组
            relatedApps.forEach(app => {
              console.log(app.platform, app.url); // 输出应用的平台和URL
            });
          })
          .catch(error => {
            console.error('Error retrieving related apps:', error);
          });
    } else {
      console.log('getInstalledRelatedApps() is not supported.');
    }
  }

  return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>Home</p>
          <Link className="App-link" to={'about'}>
            About
          </Link>
          <Install />
        </header>
      </div>
  )
}

export default Home
