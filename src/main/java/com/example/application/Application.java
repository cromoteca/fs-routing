package com.example.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.vaadin.flow.component.Component;
import com.vaadin.flow.component.page.AppShellConfigurator;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.server.RouteRegistry;
import com.vaadin.flow.server.VaadinServiceInitListener;
import com.vaadin.flow.theme.Theme;

import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * The entry point of the Spring Boot application.
 *
 * Use the @PWA annotation make the application installable on phones, tablets
 * and some desktop browsers.
 *
 */
@SpringBootApplication
@Theme(value = "fs-routing")
public class Application implements AppShellConfigurator {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    record ClientView(String defaultName, String metaValue) {
    }

    record AvailableView(String id, String route, boolean clientSide, String title, ObjectNode metadata) {

    }

    @Bean
    VaadinServiceInitListener routesInject(ObjectMapper mapper) {
        return (event) -> {
            event.addIndexHtmlRequestListener(response -> {
                try {
                    URL source = Application.class.getResource("/META-INF/VAADIN/views.json");
                    if (source == null) {
                        System.err.println("No views.json");
                        return;
                    }

                    Map<String, ClientView> clientViews = mapper.readValue(source, new TypeReference<Map<String, ClientView>>() {                        
                    });

                    List<AvailableView> availableViews = new ArrayList<>();
                    clientViews.forEach((id, clientView) -> {
                        ObjectNode metadata = null;
                        if (clientView.metaValue != null) {
                            try {
                                metadata = (ObjectNode) mapper.readTree(clientView.metaValue);
                            } catch (JsonProcessingException e) {
                                e.printStackTrace();
                            }
                        }

                        String title = clientView.defaultName;
                        if (metadata != null && metadata.has("title")) {
                            title = metadata.get("title").asText();
                        }
                        if (title.isBlank()) {
                            title = id;
                        }

                        String route = "/" + id.replaceAll("\\.[^.]*$", "");
                        if (route.endsWith("/index")) {
                            route = route.substring(0, route.length() - "/index".length());
                        }

                        availableViews.add(new AvailableView(id, route, true, title, metadata));
                    });

                    RouteRegistry registry = event.getSource().getRouter().getRegistry();
                    registry.getRegisteredRoutes().forEach(serverView -> {
                        Class<? extends Component> viewClass = serverView.getNavigationTarget();
                        String url = "/" + registry.getTargetUrl(viewClass).orElseThrow(() -> new RuntimeException("Only supporting views without parameters"));
                        
                        String title;
                        PageTitle pageTitle = viewClass.getAnnotation(PageTitle.class);
                        if (pageTitle != null) {
                            title = pageTitle.value();
                        } else {
                            title = serverView.getNavigationTarget().getSimpleName();
                        }

                        availableViews.add(new AvailableView(url, url, false, title, null));
                    });

                    if (availableViews.isEmpty()) {
                        return;
                    }
                    String viewsJson = mapper.writeValueAsString(availableViews);
                    response.getDocument().head().appendElement("script").text("window.Vaadin.views = " + viewsJson);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            });
        };
    }
}
