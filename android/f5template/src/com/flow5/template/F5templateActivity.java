package com.flow5.template;

import org.xmlpull.v1.XmlPullParser;

import android.os.Bundle;

import com.flow5.framework.MDNSResolver;
import com.phonegap.*;
import com.phonegap.api.LOG;

public class F5templateActivity extends DroidGap {
    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
    	LOG.setLogLevel("VERBOSE");
        super.onCreate(savedInstanceState);
                
        final F5templateActivity activity = this;
        final MDNSResolver resolver = new MDNSResolver(this); 
        
        new Thread(new Runnable() {
			@Override
			public void run() {
				String devservhostname = "unknown.local";
				
				XmlPullParser xpp = getApplicationContext().getResources().getXml(R.xml.f5config);				
				try {
					while (xpp.getEventType() != XmlPullParser.END_DOCUMENT) {						 
				        if (xpp.getEventType() == XmlPullParser.START_TAG) {	
				        	if (xpp.getName().equals("devservhost")) {
				        		LOG.d("F5", xpp.getName());
				        		devservhostname = xpp.getAttributeValue(null, "name");
					        	break;
				        	}
				        }				 
				        xpp.next();				 
					}									
				} catch (Exception e) {
					LOG.d("F5", e.getMessage());
				}
								              
                final String address = resolver.resolve(devservhostname);
                
                activity.runOnUiThread(new Runnable() {
					@Override
					public void run() {
						String url = "http://" + address + ":8008/generate?app=jitc&native=true&inline=true&debug=true";											
						url = ("file:///android_asset/index.html");
						LOG.d("F5", url);
		                activity.loadUrl(url);					
					}
                	
                });				
			}        	
        }).start();
    }
}