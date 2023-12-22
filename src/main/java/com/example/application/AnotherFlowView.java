package com.example.application;

import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.router.Route;

@Route
public class AnotherFlowView extends VerticalLayout {
    public AnotherFlowView() {
        add(new Span("Another Flow view"));
    }
}
